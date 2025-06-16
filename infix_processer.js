// Bracket matching, same as the one in compiler.js
function getOppositeBracket(str, index) {
    var stack = [];
    var bracketPairs = {
        '(': ')',
        ')': '(',
        '[': ']',
        ']': '[',
        '{': '}',
        '}': '{'
    };
    var currentChar = str[index];
    if(!bracketPairs[currentChar]){
    	return undefined;
    }
    var direction = '([{'.includes(currentChar) ? 1 : -1;

    for (var i = index; i >= 0 && i < str.length; i += direction) {
        var char = str[i];

        if ('([{'.includes(char)) {
            stack.push(char);
        } else if (')]}'.includes(char)) {
            if (stack.length && stack[stack.length - 1] === bracketPairs[char]) {
                stack.pop();
                if (stack.length === 0) {
                    return i;
                }
            }
        }
    }
    return -1;
}

function splitWithParentheses(str, char){
	char = char || ",";
	var arr = [];
	var curArg = "";
	var depth = 0;
	for(var i=0; i<str.length; i++){
		if(str[i] === "(" || str[i] === "{" || str[i] === "["){
			depth++;
		}
		
		if(str[i] === ")" || str[i] === "}" || str[i] === "]"){
			depth--;
		}
		if(depth !== 0){
			curArg += str[i];
			continue;
		}
		//str[i] is a seperator?
		if(str[i] === char){
			arr.push(curArg);
			curArg = "";
		}else{
			curArg += str[i];
		}
	}
	//Return arr but also that last arg
	return [...arr, curArg];
}


function buildTree(expr, opGroups /* Optional */) {
    // strip outer parentheses
    if (expr[0] === "(" && getOppositeBracket(expr, 0) === expr.length - 1) {
        expr = expr.slice(1, -1);
    }
    // handle unary minus
    var newExpr = "";
    var pchar = "";
    for (var i = 0; i < expr.length; i++) {
        var char = expr[i];
        if (char === "-" && (i === 0 || ["(", "+", "-", "*", "/"].includes(pchar))) {
            newExpr += "0-";
        } else {
            newExpr += char;
        }
        pchar = char;
    }
    expr = newExpr;

    // operator precedence groups
    var opGroups = opGroups || [
        ["+", "-"],
        ["*", "/"]
    ];

    // parse binary operators by precedence
    for (var operators of opGroups) {
        var depth = 0;
        for (var ci = 0; ci < expr.length; ci++) {
            var char = expr[ci];
            if (char === "(") {
                depth++;
                continue;
            }
            if (char === ")") {
                depth--;
                continue;
            }
            if (operators.includes(char) && depth === 0) {
                return {
                    operator: char,
                    leftSide: buildTree(expr.slice(0, ci)),
                    rightSide: buildTree(expr.slice(ci + 1))
                };
            }
        }
    }

    // BASE CASE: no operators left
    expr = expr.trim();

    // if it’s exactly “funcName(arg1, arg2, …)”, parse as a call
    if (/^[A-Za-z_][A-Za-z0-9_]*\(/.test(expr)) {
        var openParenIndex = expr.indexOf("(");
        var closeParenIndex = getOppositeBracket(expr, openParenIndex);
        if (closeParenIndex === expr.length - 1) {
            var funcName = expr.slice(0, openParenIndex);
            var argsStr = expr.slice(openParenIndex + 1, closeParenIndex);
            var args = splitWithParentheses(argsStr);
            return {
                operator: funcName,
                arguments: args.map(arg => buildTree(arg.trim(), opGroups))
            };
        }
    }

    // otherwise it’s a plain variable/number
    return expr;
}





var tempVarNames = [];
var tempVarCounter = 0;
function genTempVarName(){
	var newName = "_"+tempVarCounter;
	tempVarCounter++;
	tempVarNames.push(newName);
	return newName;
};
function deleteTempVars() {
    var res = ``;
    for (var i = 0; i < tempVarNames.length; i++) {
        res += `
delete ${tempVarNames[i]}
`;
    }
    tempVarNames = [];
    tempVarCounter = 0;
    return res;
}


var res = "";

function processTree(tree) {
	res = "";  // Reset res each time processTree is called

	function recurse(node) {
		if (typeof node === "string") {
			return node;
		}

		// Handle function calls
		if (node.arguments) {
			var argNames = [];
			for (var i = 0; i < node.arguments.length; i++) {
				argNames.push(recurse(node.arguments[i]));
			}

			var tempVarName = genTempVarName();
			res += "int8 " + tempVarName + " = 0\n";
			res += tempVarName + " = call " + node.operator + " " + argNames.join(" ") + "\n";
			return tempVarName;
		}

		// Handle binary operators
		var oper = node.operator;
		var ls = recurse(node.leftSide);
		var rs = recurse(node.rightSide);

		var tempVarName = genTempVarName();
		res += "int8 " + tempVarName + " = 0\n";
		res += tempVarName + " = " + ls + " " + oper + " " + rs + "\n";

		return tempVarName;
	}

	var final = recurse(tree);

	return { res: res, resultName: final };
}


function splitCode(fire){
	var lines = fire.split("\n");
	var newFire = "";
	
	for(var i=0;i<lines.length;i++){
		var line = lines[i];
		///If line contains a + - * = < or > but NOT a if/while* /
		if (/[+\-*/=<>]/.test(line) && !/if|while|for/.test(line)) {
			//Creating a variable
			//Assigning a var.
			if(/int8/.test(line)){
				var varName = line.replaceAll("int8","").split("=")[0].trim();
				var expr = line.replaceAll("int8", "").split("=")[1].trim();
				var tree = buildTree(expr);
				var compiled = processTree(tree);
				newFire += `
int8 ${varName} = 0

${compiled.res}

${varName} = ${compiled.resultName}
`;
			}else{
				var varName = line.split("=")[0].trim();
				var expr = line.split("=")[1].trim();
				var tree = buildTree(expr);
				var compiled = processTree(tree);
				newFire += `
${compiled.res}
${varName} = ${compiled.resultName}
				`;
			}
		}else{
			newFire += line+"\n";
		}
		newFire+=deleteTempVars();

	}
	return newFire;
};

module.exports = {
	buildTree: buildTree,
	splitCode: splitCode,
	splitWithParentheses: splitWithParentheses,
}
console.log(buildTree(`
f(e)
`))
