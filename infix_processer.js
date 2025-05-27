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
	if(expr[0] === "(" && getOppositeBracket(expr, 0) === expr.length-1){
		expr = expr.slice(1, -1);
	}
	var newExpr = "";
	var pchar = "";

	for (var i = 0; i < expr.length; i++) {
		var char = expr[i];

		if (char === "-" && (i === 0 || ["(", "+", "-", "*", "/"].includes(pchar))) {
			newExpr += "0-"; // Insert 0-
		} else {
			newExpr += char;
		}

		pchar = char;
	}
	expr = newExpr;

	// Operator groups by precedence: lowest to highest
	var opGroups = opGroups || [
		["+", "-"],
		["*", "/"]
	];
	//Is a function call?
	
	if(/^[A-Za-z0-9_%@]+\(/.test(expr)){
		var openParenIndex = expr.indexOf("(");
		var closeParenIndex = getOppositeBracket(expr, openParenIndex);
		//Eliminate cases like f(x)+1
		if(closeParenIndex === expr.length-1){
			var argsStr = expr.slice(openParenIndex+1, closeParenIndex);
			var args = splitWithParentheses(argsStr);
			var funcName = expr.split("(")[0];
			return {
				operator: funcName,
				//Build tree for EVERY argument
				arguments: args.map(arg => buildTree(arg.trim(), opGroups))
			};
		}
	}
	
	for(var operators of opGroups){
		var depth = 0;
		for(var ci=0;ci<expr.length;ci++){
			var char = expr[ci];
			//Keep track of depth
			if(char === "("){
				depth++;
				continue;
			}
			if(char === ")"){
				depth--;
				continue;
			}
			
			
			if(operators.includes(char) && depth === 0){
				return {
					operator: char,
					leftSide: buildTree(expr.slice(0, ci)),
					rightSide: buildTree(expr.slice(ci+1))
				}
			}
		}
	}
	// Base case: no operators left "x"
	return expr.trim();
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

        var oper = node.operator;
        var ls = recurse(node.leftSide);
        var rs = recurse(node.rightSide);

        var tempVarName = genTempVarName();
        //note theres no semicolon because theyre supposed to be removed
        res += "int8 " + tempVarName + " = 0\n";
        res += tempVarName + " = " + ls + " " + oper + " " + rs + "\n";

        return tempVarName;
    }

    var final = recurse(tree);

    return {res: res, resultName: final};
}

function splitCode(fire){
	var lines = fire.split("\n");
	var newFire = "";
	
	for(var i=0;i<lines.length;i++){
		var line = lines[i];
		///If line contains a + - * = < or > but NOT a if/while* /
		if (/[+\-*/=<>]/.test(line) && !/if|while/.test(line)) {
			//Creating a variable
			//Assigning a var.
			if(/int8/.test(line)){
				var varName = line.replaceAll("int8","").split("=")[0].trim();
				var expr = line.replaceAll("int8", "").split("=")[1].trim();
				var tree = buildTree(expr);
				var compiled = processTree(tree);
				newFire += `
int8 ${varName} = 0;

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
	splitCode: splitCode
}


