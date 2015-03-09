var canvas;
var gl;
var programId;

var constants;
var color;
var points = [];
var colors = [];
var colorsBuffer;
var pointsBuffer;

var theta = vec3(0.0);   // A vec3 containing Axis angles
var modify = vec3(0.0); // a quick and dirty solution to panning and zooming
var fov = 0.0;

// Function for querying the current superquadric constants: a, b, c, d, n1, n2
function getSuperquadricConstants() {
    return {
        n1: parseFloat(document.getElementById("superquadric-constant-n1").value),
        n2: parseFloat(document.getElementById("superquadric-constant-n2").value),
        a:  parseFloat(document.getElementById("superquadric-constant-a").value),
        b:  parseFloat(document.getElementById("superquadric-constant-b").value),
        c:  parseFloat(document.getElementById("superquadric-constant-c").value),
        fov:parseFloat(document.getElementById("constant-fov").value)
    }
}

// Function for querying the current wireframe color
function getWireframeColor() {
    var hex   = document.getElementById("foreground-color").value;
    var red   = parseInt(hex.substring(1, 3), 16);
    var green = parseInt(hex.substring(3, 5), 16);
    var blue  = parseInt(hex.substring(5, 7), 16);
    return vec4(red / 255.0, green / 255.0, blue / 255.0, 1);
}

function updateBuffers()
{
    constants = getSuperquadricConstants(); 
    color     = getWireframeColor();

    fov       = 1 - constants.fov;

    points = genGrid(50);
    colors = genColorsFor(points);

    gl.bindBuffer( gl.ARRAY_BUFFER, colorsBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
    gl.bindBuffer( gl.ARRAY_BUFFER, pointsBuffer ); // bind the buffer
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW ); 
}



function keyFunctions(event) { // listener for on key down
    var delta = .01;
    console.log(event.keyCode);
    if(event.keyCode == 190)       modify = add(modify, vec3(0,0,delta));  // >
    else if(event.keyCode == 188)  modify = add(modify, vec3(0,0,-delta)); // < 
    else if(event.keyCode == 37)   modify = add(modify, vec3(delta,0,0));  // LEFT
    else if(event.keyCode == 39)   modify = add(modify, vec3(-delta,0,0)); // RIGHT
    else if(event.keyCode == 38)   modify = add(modify, vec3(0,-delta,0)); // UP
    else if(event.keyCode == 40)   modify = add(modify, vec3(0,delta,0));  // DOWN
    else if(event.keyCode == 77)   fov+= delta;
    else if(event.keyCode == 78)   fov-= delta;
}

function mouseFunctions(event){
    var delta = .3;
    if(event.which == 1) // if mouse button 1 is down
    {
        theta = add(theta, vec3(0.0,event.movementX*delta,0.0)); // all movement in the X should rotate plane y
        theta = add(theta, vec3(event.movementY*delta,0.0,0.0)); // all movement in the X should rotate plane y
    }
}


// Binds "on-change" events for the controls on the web page
function initControlEvents() {
    var elements = document.getElementsByClassName("updater")
    for(i = 0; i < elements.length ; i++)
        elements[i].onchange = updateBuffers;
    document.onkeydown   = keyFunctions; // allow for keyboard presses
    document.onmousemove = mouseFunctions;

}




window.onload = function() {
    canvas = document.getElementById("gl-canvas"); // Find the canvas on the page
    gl = WebGLUtils.setupWebGL(canvas); // Initialize a WebGL context
    
    if (!gl) { alert("WebGL isn't available"); } // error incase gl does not function
    
    
    programId = initShaders(gl, "vertex-shader", "fragment-shader");// Load shaders
    gl.useProgram(programId);
        
    thetaUL  = gl.getUniformLocation( programId, "theta" );//add a rotation array to the shader
    modifyUL = gl.getUniformLocation( programId, "mv" ); // add a manipulation vector 
    fovUL    = gl.getUniformLocation( programId, "fov" ); // add a manipulation vector 
    





	pointsBuffer = gl.createBuffer(); // create the buffer for points
    colorsBuffer = gl.createBuffer(); // create the buffer for color
    updateBuffers(); // fill them with data

/*
    console.log(points.length + " total points\n " + colors.length + " total colors");
    console.log(constants);
    console.log(points);
    console.log(colors);
*/


    initControlEvents();



	 
	gl.bindBuffer( gl.ARRAY_BUFFER, pointsBuffer ); // select buffer
    var vPositionL = gl.getAttribLocation( programId, "vPosition" ); // grab a reference to the shaders attribute "vPosition"
    gl.enableVertexAttribArray( vPositionL );
    gl.vertexAttribPointer(vPositionL, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer( gl.ARRAY_BUFFER, colorsBuffer );
    var vColorL = gl.getAttribLocation( programId, "vColor" );
    gl.enableVertexAttribArray( vColorL );
    gl.vertexAttribPointer( vColorL, 4, gl.FLOAT, false, 0, 0 );	
	
    window.setInterval(function () {
		display(); 	
	  }, 16);

};



function display() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );  
	gl.uniform3fv( thetaUL, theta );
	gl.uniform3fv( modifyUL, modify);
	gl.uniform1f( fovUL, fov);
	gl.drawArrays( gl.LINES, 0, points.length);

}

function genPoints(dim) {
    var array = [];
    var cells = dim - 1; // ie.  intervals between points // number points = dim^2

    for(u = -Math.PI; u <= Math.PI; u += (2*Math.PI)/cells)
        for(v = -Math.PI/2; v <= Math.PI/2; v += Math.PI/cells)
            array.push( vec4(xAt(u,v),yAt(u,v),zAt(u,v),1) );
    return array;
}

function genGrid(dim) {
    var array = [];
    var cells = dim - 1; // ie.  intervals between points // number points = dim^2

    var du = (2*Math.PI)/cells;
    var dv = Math.PI/cells;
    

    for(var u = -Math.PI; u < Math.PI; u += du)
    {
        for(var v = -Math.PI/2; v < Math.PI/2; v += dv)
        {
            var vector = vec4( 
                xAt(u,v),
                yAt(u,v),
                zAt(u,v),
                1
            );
            var vectorD = vec4(
                xAt(u+du,v),
                yAt(u+du,v),
                zAt(u+du,v),
                1
            );
            var vectorR = vec4(
                xAt(u,v+dv),
                yAt(u,v+dv),
                zAt(u,v+dv),
                1
            );
            array.push(vector);
            array.push(vectorR);
            array.push(vector);
            array.push(vectorD);
        }    }
    return array;
}

function genColorsFor(p) {
    var array= [];
    for(i = 0 ; i < p.length ; i++)
        array.push(color);
    return array;
}

// Math shortcuts
function cos(arg) {return Math.cos(arg);}
function sin(arg) {return Math.sin(arg);}
function pow(arg1,arg2) {return Math.pow(arg1,arg2);}
function sign(arg)
{
    return arg / Math.abs(arg);
}

function xAt(u,v)
{
    return constants.a *
     (sign(cos(v))*pow(pow(cos(v),2),1/constants.n1)) *
     (sign(cos(u))*pow(pow(cos(u),2),1/constants.n2));
}

function yAt(u,v)
{
     return constants.b *
      (sign(cos(v))*pow(pow(cos(v),2),1/constants.n1)) *
      (sign(sin(u))*pow(pow(sin(u),2),1/constants.n2));
}

function zAt(u,v)
{
    return constants.c *
     (sign(sin(v))*pow(pow(sin(v),2),1/constants.n1));
}

