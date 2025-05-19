# firescript-compiler
A fully functioning compiler in Node.js for the language _FireScript_, that compiles to MattBatwings' 8 bit assembly emulator.

**Emulator**: https://github.com/mattbatwings/BatPU-2?tab=readme-ov-file

**Assembly ISA (Instruction Set Architecture)**: https://docs.google.com/spreadsheets/d/1Bj3wHV-JifR2vP4HRYoCWrdXYp3sGMG0Q58Nm56W4aI/edit?gid=0#gid=0



**Language Features**:

**Variables**: Supports variables with automatic memory allocation

**Arithmetic Operations**: Addition (+), subtraction (-), multiplication (*)

**Control Flow**:

  *If statements with comparisons* (>, <, >=, <=, ==, !=)

  *While loops*

  *For loops* (which get transformed into while loops during compilation)

**I/O Operations**:

  *String output* (str_out)

  *Numeric output* (num_out)

**Low-level Access**: Can embed raw assembly code using $ prefix

**Comments**: Single-line comments with //

**Memory Management**: Automatic memory allocation for variables

## Syntax Examples:

**Variable Declaration**:

`int8 x = 5;`

**Assignment**:

`x = 10;`

**Arithmetic**:

`y = x + 5;`

`z = y * 2;`

**If Statement**:

`if(x > 5) {`

    `// code`
    
`}`

**While Loop***:

`while(x < 10) {`

    `// code`
    
`}`

**For Loop (transformed to while)**:

`for(int8 i=0; i<10; i++) {`

    `// code`
    
`}`

**Output**:

`str_out("Hello");

push_str;

num_out(42);
`

**Inline Assembly (Not that usefull)**:

`$MOV r1 r2;`

**String (Char-Seq) Handling:**

`str_out("ABC");

push_str;`

**Functions (no in no out, use variables until adedd):**

`do_func name {

	//code here
 
}`
