/*

Big summary by deepseek:



Language Features:
Variables: Supports variables with automatic memory allocation

Arithmetic Operations: Addition (+), subtraction (-), multiplication (*)

Control Flow:

If statements with comparisons (>, <, >=, <=, ==, !=)

While loops

For loops (which get transformed into while loops during compilation)

I/O Operations:

String output (str_out)

Numeric output (num_out)

Low-level Access: Can embed raw assembly code using $ prefix

Comments: Single-line comments with //

Memory Management: Automatic memory allocation for variables

Syntax Examples:
Variable Declaration:

int8 x = 5;
Assignment:

x = 10;
Arithmetic:

y = x + 5;
z = y * 2;
If Statement:

if(x > 5) {
    // code
}
While Loop:

while(x < 10) {
    // code
}
For Loop (transformed to while):

for(int8 i=0; i<10; i++) {
    // code
}
Output:

str_out("Hello");
push_str;
num_out(42);
Inline Assembly:

$MOV r1 r2;
String Handling:

str_out("ABC");
push_str;

Functions (no return no input, use variables until adedd):

do_func name {
	code here
}
*/


function removeIndentation(str) {
	var lines = str.split("\n");
	var out = "";
	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].replace(/^\u0009+/, "");
		out += line + "\n";
	}
	return out.trimEnd();
}




var debugMode = true;
var fs = require('fs');
var path = __dirname + '/firescript2.fire';
var fire = fs.readFileSync(path, 'utf8');

fire = removeIndentation(fire);

var actualLineNumber = 1; //sadly text editors arent 0 indexed

var lines = fire.split("\n");
if(!debugMode){
	for (var i = 0; i < lines.length; i++) {
		if (i % 2 !== 0) {
		    lines.splice(i, 0, "compiler:nextline"); 
		    i++;
		}
	}
}


//remove comments
for (var i = 0; i < lines.length; i++) {
	//ill make more elaborate LATER
	if (lines[i][0] === '/' && lines[i][1] === '/') {
	    lines[i]=""; //that comment never existed
	}
}

fire = lines.join("\n");

// Global variables
var result = `
LDI r15 clear_chars_buffer
STR r15 r0
define end_char 255
LDI r0 0 //IG its redundant, but who cares about 1/500 of a second?
//Gets r2th bit of r1
JMP .BIF_getbit_end
.BIF_getbit
    LDI r3 1        // r3 = 1 (mask thing)
    .BIF_getbit_shift_loop
        ADD r2 0 r0 //Set 'zero' to (is r1 0?)
        BRH zero .BIF_getbit_done     // If r2 == 0, exit loop
        RSH r1 r1       // Logical right shift r1 >> 1
        DEC r2
        JMP .BIF_getbit_shift_loop   // Repeat until r2 == 0

    .BIF_getbit_done
        AND r1 r3 r1
        RET
.BIF_getbit_end

//Built in function: getbit from pow of 2.
//gets log(r2)th bit of r1.
//returns 0 if the bit is 0,
//some other nunber is it isnt (NOT NECCECARLY 1)

JMP .BIF_getbit_PO2_end
.BIF_getbit_PO2
    AND r1 r2 r1 //Wont be 1 always
.BIF_getbit_PO2_end


JMP .BIF_mult_end

.BIF_mult // Multiply r1 and r2, store result in r3
    LDI r3 0       // Initialize result to 0
    LDI r4 1
    .BIF_mult_loop_start
        ADI r2 0            // Check if r2 is zero
        BRH zero .BIF_mult_loop_end // Exit loop if r2 == 0
        
        AND r4 r2 r0         // Check LSB of r2
        BRH zero .BIF_mult_shift // Skip adding if LSB is 0
        
        ADD r3 r1 r3        // Add r1 to result if LSB is 1
        
    .BIF_mult_shift
        LSH r1 r1           // Shift multiplicand left
        RSH r2 r2           // Shift multiplier right
        JMP .BIF_mult_loop_start

.BIF_mult_loop_end
    RET
.BIF_mult_end


`;

// String utility functions
function initializeStringUtils() {
    String.prototype.splice = function(index, deleteCount, insertStr = "") {
        var arr = this.split('');
        arr.splice(index, deleteCount, insertStr);
        return arr.join('');
    };

    String.prototype.cut = function(start, end) {
        let len = this.length;
        if (start < 0) start = len + start;
        if (end < 0) end = len + end;
        return this.slice(0, start) + this.slice(end + 1);
    };

    String.prototype.pluck = function(start, end) {
        let len = this.length;
        if (start < 0) start = len + start;
        if (end < 0) end = len + end;
        return this.slice(start, end + 1);
    };
}



initializeStringUtils();


// Helper functions
function removeTrailingSemicolon(str) {
    return str.endsWith(";") ? str.slice(0, -1) : str;
}

function isNumber(str) {
    return /^\d+$/.test(str);
}

function insertSubstr(str, index, substr) {
    return str.slice(0, index) + substr + str.slice(index);
}

// Special characters and token processing.
const specialChars = ["call","for", "do_func ", "while", "push_str", "str_out", "num_out", "=", "$", "int8 ", "+", "-", "*", "if", ">=", "<", "=", "!=", "<=", ">", "//"];

function getSpecialChars(str) {
    let res = [];
    let inQuotes = false;
    let quoteChar = null;
    
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        
        // Toggle quote state
        if (char === '"' || char === "'") {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && str[i - 1] !== '\\') {
                inQuotes = false;
                quoteChar = null;
            }
        }
        
        if (inQuotes) continue;

        let longestMatch = "";
        for (let j = 0; j < specialChars.length; j++) {
            const special = specialChars[j];
            if (str.substr(i, special.length) === special && special.length > longestMatch.length) {
                longestMatch = special;
            }
        }
        
        if (longestMatch) {
            res.push(longestMatch);
            i += longestMatch.length - 1;
        }
    }
    return res;
}

function andArrays(arr1, arr2) {
    return arr1.filter(val => arr2.includes(val));
}

// Memory management
var alloced = [0]; // IDs of used memIDs
var variables = {
    "test": { location: 0 } // memloc 0 is test var
};
var curTagName = 0;

function getNewMemId() {
    for (var i = 0; i < 255; i++) {
        if (!alloced.includes(i)) {
            return i;
        }
    }
    throw new Error("Ran out of memIds");
}

// Bracket matching
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

// Code transformation functions
function transformForLoops() {
    for (var lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        var line = lines[lineNumber];
        if (getSpecialChars(line).includes("for")) {
            line = line.replace(")", ";");
            line = line.replace("(", ";");
            var parts = line.split(";");
            var varDecl = parts[1].trim();
            var condition = parts[2].trim();
            var incStatement = parts[3].trim();
            
            line = `
${varDecl}
while(${condition}){
    ${incStatement}
`;
            var newProgram = [...lines];
            newProgram[lineNumber] = line;
            fire = newProgram.join("\n");
            lines = fire.split("\n");
        }
    }
    fire = lines.join("\n")
}


function processLine(line, lineNumber) {
    var lineRes = "";
    line = removeTrailingSemicolon(line);
    var debugData = getSpecialChars(line);
    line = line.trim();

	if (line === "compiler:nextline"){
		//this is a new line of the ORIGINAL marked by the compiler so errors are better
		actualLineNumber++;
	}
	else if(getSpecialChars(line).includes("//")){
		return `
/// ${line}
`
	}
    else if (getSpecialChars(line).toString() == ["="].toString()) {
        lineRes = processAssignment(line);
    } 
    else if (getSpecialChars(line).includes("int8 ")) {
        lineRes = processint8(line);
    }
    else if (getSpecialChars(line).includes("+")) {
        lineRes = processAddition(line);
    } 
    else if (getSpecialChars(line).includes("-")) {
        lineRes = processSubtraction(line);
    } 
    else if (getSpecialChars(line).includes("*")) {
        lineRes = processMultiplication(line);
    }
    else if (getSpecialChars(line).includes("do_func ") && !getSpecialChars(line).includes("\"")){
    	lineRes = processDoFunc(line);
    }
    else if (getSpecialChars(line).includes("call") && !getSpecialChars(line).includes("\"")){
    	lineRes = processCall(line);
    }
    else if (getSpecialChars(line).includes("if") && !getSpecialChars(line).includes("\"")) {
        lineRes = processIfStatement(line);
    }
    else if (getSpecialChars(line).includes("str_out")) {
        lineRes = processStringOutput(line);
    } 
    else if (getSpecialChars(line).includes("num_out")) {
        lineRes = processNumberOutput(line);
    } 
    else if (line === "push_str") {
        lineRes = processPushString();
    } 
    else if (line === "}") {
        console.log("\n\n\nHmm, i detected a }, which is not hr2^2 (Meme):\n\nUncaught BrainError: unexpected char: '}'\n on line " +actualLineNumber);
        process.exit(1);
    } 
    else if (line[0] == "$") {
        lineRes = processAssemblyCode(line);
    } 
    else if (getSpecialChars(line).includes("while") && !getSpecialChars(line).includes("\"")) {
        lineRes = processWhileLoop(line);
    }
	
    if (debugData) console.log(debugData);
    return lineRes;
}

function processAssignment(line) {
    var varName = line.split("=")[0].trim();
    var val = line.split("=")[1].trim();
    var varLocation = variables[varName].location;
    return `
//Set the variable ${varName} to ${val}, with memloc ${varLocation}
LDI r1 ${val}
STR r0 r1 ${varLocation}
`;
}

function processint8(line) {
    line = line.replace("int8", "").trim();
    var varName = line.split("=")[0].trim();
    var val = line.split("=")[1].trim();
    var varLocation = getNewMemId();
    variables[varName] = { location: varLocation };
    alloced.push(varLocation);
    return `
//Set the variable ${varName} to ${val}, with memloc ${varLocation}
LDI r1 ${val}
STR r0 r1 ${varLocation}
`;
}

function processAddition(line) {
    if (!getSpecialChars(line).includes("=") || getSpecialChars(line).includes("int8 ")) {
        console.log("Err line " + i);
        process.exit(1);
    }

    var writingVarName = line.split("=")[0].trim();
    var writingVarLocation = variables[writingVarName].location;
    var expression = line.split("=")[1].trim();
    var expressionVal1 = expression.split("+")[0].trim();
    var expressionVal2 = expression.split("+")[1].trim();
    
    var res = "";
    
    if (isNumber(expressionVal1)) {
        res += `LDI r3 ${expressionVal1} //Load ${expressionVal1} to reg3\n`;
    } else {
        var expressionVal1ID = variables[expressionVal1].location;
        res += `LOD r0 r3 ${expressionVal1ID} //Get the variable ${expressionVal1} and write/load it to r3\n`;
    }
    
    if (isNumber(expressionVal2)) {
        res += `LDI r4 ${expressionVal2} //Load ${expressionVal2} to reg3\n`;
    } else {
        var expressionVal2ID = variables[expressionVal2].location;
        res += `LOD r0 r4 ${expressionVal2ID} //Get the variable ${expressionVal2} and write/load it to r3\n`;
    }
    
    res += `
ADD r3 r4 r2 //add regs r3 and r4 and write it to r2
//Set the variable ${writingVarName} to the result, with memloc ${writingVarLocation}
STR r0 r2 ${writingVarLocation}
`;
    return res;
}

function processSubtraction(line) {
    if (!getSpecialChars(line).includes("=") ||
    	getSpecialChars(line).includes("int8 ")) {
    		
        console.log("Syntax Error line " + actualLineNumber+ "\n Uncaught BrainError. ");
        process.exit(1);
    }

    var writingVarName = line.split("=")[0].trim();
    var writingVarLocation = variables[writingVarName].location;
    var expression = line.split("=")[1].trim();
    var expressionVal1 = expression.split("-")[0].trim();
    var expressionVal2 = expression.split("-")[1].trim();
    
    var res = "";
    
    if (isNumber(expressionVal1)) {
        res += `LDI r3 ${expressionVal1} //Load ${expressionVal1} to reg3\n`;
    } else {
        var expressionVal1ID = variables[expressionVal1].location;
        res += `LOD r0 r3 ${expressionVal1ID} //Get the variable ${expressionVal1} and write/load it to r3\n`;
    }
    
    if (isNumber(expressionVal2)) {
        res += `LDI r4 ${expressionVal2} //Load ${expressionVal2} to reg3\n`;
    } else {
        var expressionVal2ID = variables[expressionVal2].location;
        res += `LOD r0 r4 ${expressionVal2ID} //Get the variable ${expressionVal2} and write/load it to r3\n`;
    }
    
    res += `
SUB r3 r4 r2 //add regs r3 and r4 and write it to r2
//Set the variable ${writingVarName} to the result, with memloc ${writingVarLocation}
STR r0 r2 ${writingVarLocation}
`;
    return res;
}

function processMultiplication(line) {
    if (!getSpecialChars(line).includes("=") || getSpecialChars(line).includes("int8 ")) {
        console.log("Err line " + i);
        process.exit(1);
    }

    var writingVarName = line.split("=")[0].trim();
    var writingVarLocation = variables[writingVarName].location;
    var expression = line.split("=")[1].trim();
    var expressionVal1 = expression.split("*")[0].trim();
    var expressionVal2 = expression.split("*")[1].trim();
    
    var res = "";
    
    if (isNumber(expressionVal1)) {
        res += `LDI r1 ${expressionVal1} //Load ${expressionVal1} to reg1\n`;
    } else {
        var expressionVal1ID = variables[expressionVal1].location;
        res += `LOD r0 r1 ${expressionVal1ID} //Get the variable ${expressionVal1} and write/load it to r1\n`;
    }
    
    if (isNumber(expressionVal2)) {
        res += `LDI r2 ${expressionVal2} //Load ${expressionVal2} to reg2\n`;
    } else {
        var expressionVal2ID = variables[expressionVal2].location;
        res += `LOD r0 r2 ${expressionVal2ID} //Get the variable ${expressionVal2} and write/load it to r2\n`;
    }
    
    res += `
CAL .BIF_mult
MOV r3 r2
//Set the variable ${writingVarName} to the result, with memloc ${writingVarLocation}
STR r0 r2 ${writingVarLocation}
`;
    return res;
}



function processDoFunc(line) {
	// Syntax
	//do_func name {
	//	-- code --
	//}
	
	var res = "";
	var funcName = line.split(" ")[1].replaceAll("{", "")
	

	// === Get bracket index in full fire string ===
	var bracketIndexInLine = line.indexOf("{");
	var bracketIndexInFire = bracketIndexInLine;
	for (var i = 0; i < lineNumber; i++) {
		bracketIndexInFire += lines[i].length + 1; // include \n
	}

	res += `
	
JMP .closingFunc${funcName}
.opening${funcName}

`


	// === Find and replace matching closing brace ===
	var closingIndex = getOppositeBracket(fire, bracketIndexInFire);
	
    // Remove the '{'
    fire = fire.splice(bracketIndexInFire, 1);
    // Adjust closingIndex since we removed a char.
    closingIndex--;
	
	
	fire = fire.splice(closingIndex, 1);
	fire = insertSubstr(fire, closingIndex, `
$RET
$.closingFunc${funcName}
`);

	curTagName++;
	lines = fire.split("\n"); // update lines to reflect new fire
	return res;
}
function processCall(line) {
	//Syntax: call funcName
	var funcName = line.split(" ")[1];
	return `
CAL .opening${funcName}
`
}



function processIfStatement(line) {
	line = line.replace("(", ":");
	line = line.replace(")", ":");
	var res = "";

	// === Get bracket index in full fire string ===
	var bracketIndexInLine = line.indexOf("{");
	var bracketIndexInFire = bracketIndexInLine;
	for (var i = 0; i < lineNumber; i++) {
		bracketIndexInFire += lines[i].length + 1; // include \n
	}

	// === Parse condition ===
	var condition = line.split(":")[1].trim();
	var isSpecialCondition = false;
	var conditionSign = andArrays(getSpecialChars(line), ["<", ">=", "=", "!="])[0]?.trim();

	if (!conditionSign) {
		isSpecialCondition = true;
		conditionSign = andArrays(getSpecialChars(line), [">", "<="])[0].trim();
	}

	var leftSide = condition.split(conditionSign)[0].trim();
	var rightSide = condition.split(conditionSign)[1].trim();

	// === Load left ===
	if (isNumber(leftSide)) {
		res += `LDI r1 ${leftSide}\n`;
	} else {
		var leftId = variables[leftSide].location;
		res += `LOD r0 r1 ${leftId} // Load var ${leftSide}\n`;
	}

	// === Load right ===
	if (isNumber(rightSide)) {
		res += `LDI r2 ${rightSide}\n`;
	} else {
		var rightId = variables[rightSide].location;
		res += `LOD r0 r2 ${rightId} // Load var ${rightSide}\n`;
	}

	// === Branch logic ===
	if (isSpecialCondition) {
		if (conditionSign === ">") {
			res += `
CMP r1 r2
BRH >= .nextIF${curTagName}
JMP .closingIF${curTagName}
.nextIF${curTagName}
BRH = .closingIF${curTagName}
.doIF${curTagName}
`;
		} else if (conditionSign === "<=") {
			res += `
CMP r1 r2
BRH < .doIF${curTagName}
BRH = .doIF${curTagName}
JMP .closingIF${curTagName}
.doIF${curTagName}
`;
		}
	} else {
		res += `
CMP r1 r2
BRH ${conditionSign} .doIF${curTagName}
JMP .closingIF${curTagName}
.doIF${curTagName}
`;
	}





	// === Find and replace matching closing brace ===
	var closingIndex = getOppositeBracket(fire, bracketIndexInFire);
	
	    
    // Remove the '{'
    fire = fire.splice(bracketIndexInFire, 1);
    // Adjust closingIndex since we removed a char.
    closingIndex--;
	
	
	fire = fire.splice(closingIndex, 1);
	fire = insertSubstr(fire, closingIndex, "$.closingIF" + curTagName);

	curTagName++;
	lines = fire.split("\n"); // update lines to reflect new fire
	return res;
}
function processStringOutput(line) {
    var charset = " QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm";
    line = line.replace("(", ":");
    line = line.replace(")", ":");
    var string = line.split(":")[1];
    var res = `LDI r15 write_char\n`;
    
    if (!getSpecialChars(fire).includes("push_str")) {
        console.log("Push String Not Found");
        process.exit(1);
    }
    
    if (string.includes('"')) {
        string = string.replaceAll('"', "");
        for (var i = 0; i < string.length; i++) {
            if (charset.indexOf(string[i]) === -1) {
                console.log("Invalid char for str_out(str): " + string[i] +"\n On line "+actualLineNumber);
                process.exit(1);
            }
            res += `LDI r14 "${string[i]}"\nSTR r15 r14\n`;
        }
    } else {
        console.log("Numbers and variables arent allowed for str_out()." + i);
        process.exit(1);
    }
    
    return res;
}

function processNumberOutput(line) {
    line = line.replace("(", ":");
    line = line.replace(")", ":");
    var arg = line.split(":")[1];
    var res = `LDI r15 show_number;\n`;
    
    if (isNumber(arg)) {
        res += `LDI r14 ${arg}\nSTR r15 r14\n`;
    } else {
        var varLocation = variables[arg].location;
        res += `LOD r0 r14 ${varLocation} //Get the variable ${arg} and write/load it to r14\nSTR r15 r14\n`;
    }
    
    return res;
}

function processPushString() {
    return `\n// Push character buffer\nLDI r15 buffer_chars\nSTR r15 r0\n`;
}

function processAssemblyCode(line) {
    return line.cut(0, 0);
}
var lineNumber = 0;
function processWhileLoop(line) {
	//program wants while:condition:{
    line = line.replace("(", ":");
    line = line.replace(")", ":");
    var res = `.startingWHILE${curTagName}\n`;
    
    
    
    //This part gets complicated, commented by ChatGPT. Note I wrote it though:
    
    
	// Get the index of the opening curly brace '{' within the current line
	var bracketIndexInLine = line.indexOf("{");

	// Initialize the overall index in the full `fire` string to the local index
	var bracketIndexInFire = bracketIndexInLine;

	// Loop through all lines before the current one
	console.log("LN: ",lineNumber)
	for (var i = 0; i < lineNumber; i++) {
		// Add the length of each line and 1 extra for the newline character
		bracketIndexInFire += lines[i].length + 1; // '\n' takes up one character
	}

	//End complicated part.
	//Wait no the rest is too. Sorry for no comments tho
    var condition = line.split(":")[1].trim();
    var isSpecialCondition = false;
    var conditionSign = andArrays(getSpecialChars(line), ["<", ">=", "=", "!="])[0]?.trim();
    
    if (!conditionSign) {
        isSpecialCondition = true;
        conditionSign = andArrays(getSpecialChars(line), [">", "<="])[0].trim();
    }
    
    console.log(conditionSign + " " + isSpecialCondition);
    var leftSide = condition.split(conditionSign)[0].trim();
    var rightSide = condition.split(conditionSign)[1].trim();
    
    if (isNumber(leftSide)) {
        res += `LDI r1 ${leftSide}\n`;
    } else {
        var leftSideId = variables[leftSide].location;
        res += `LOD r0 r1 ${leftSideId} //Get the variable ${leftSide} and write/load it to r1\n`;
    }
    
    if (isNumber(rightSide)) {
        res += `LDI r2 ${rightSide}\n`;
    } else {
        var rightSideId = variables[rightSide].location;
        res += `LOD r0 r2 ${rightSideId} //Get the variable ${rightSide} and write/load it to r2\n`;
    }
    
    if (isSpecialCondition) {
        if (conditionSign === ">") {
            res += `
CMP r1 r2
BRH >= .nextWHILE${curTagName};
JMP .closingWHILE${curTagName};
.nextWHILE${curTagName}
BRH = .closingWHILE${curTagName}
.doWHILE${curTagName} 
`;
        }
        if (conditionSign === "<=") {
            res += `
CMP r1 r2
BRH < .startingWHILE${curTagName}
BRH = .startingWHILE${curTagName}
JMP .closingWHILE${curTagName}
.doIF${curTagName} 
`;
        }
    } else {
        res += `
CMP r1 r2 //Compare r1 and r2
BRH ${conditionSign} .doWHILE${curTagName}
JMP .closingWHILE${curTagName}
.doWHILE${curTagName}
`;
    }
    
    console.log(bracketIndexInFire, fire[bracketIndexInFire])
    var closingIndex = getOppositeBracket(fire, bracketIndexInFire);
    
    // Remove the '{'
    fire = fire.splice(bracketIndexInFire, 1);
    // Adjust closingIndex since we removed a char.
    closingIndex--;
    
    fire = fire.splice(closingIndex, 1);
    console.log("Removed }")
    fire = insertSubstr(fire, closingIndex, `
$JMP .startingWhile${curTagName}
$.closingWHILE${curTagName}
`);
	console.log(fire);
    curTagName++;
    
    lines = fire.split("\n");
    return res;
}

// Main execution

function main() {
    var lines = fire.split("\n");
    
    // Transform for loops first
    transformForLoops(lines);
    
    // Process each line
    for (lineNumber = 0; lineNumber < lines.length; lineNumber++) {
        var lineRes = processLine(lines[lineNumber], lineNumber);
        result += lineRes + "\n";
        lines = fire.split("\n");
        
        console.log(fire+"\n\n");
    }
    
    result += `HLT\n`;
    console.log(result);
}


main();


fs.writeFileSync('output.as', result, 'utf8');
/*Made By SilverNickelStudios -- Agni*/
