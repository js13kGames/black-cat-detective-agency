import fs from 'node:fs';
import path from 'node:path';
import child_process from 'node:child_process';
import advzipBin from 'advzip-bin';

// This is a simplified and broken down version of the LittleJS Build System so I could figure out how it works!

// make the build folder if it doesn't exist
fs.mkdirSync('build', { recursive: true });

const outputDir = 'build';
const originalDir = 'src';

try {

    // clear out the build directory
    fs.readdirSync(outputDir).forEach(file => {
        const filePath = path.join(outputDir, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });

    // 1. Copy files into a buffer
    let buffer = '';
    // note: order matters here!
    const filePaths = ['m4.js', 'utils.js', '2d.js', 'object.js', '3d.js'];
    for (const filePath of filePaths) {
        const file = path.join(originalDir, filePath);
        // make sure the file is a .js file!
        if (path.extname(file) !== '.js') {
            console.log(`Skipping non-js file: ${file}`);
            continue;
        } else {
            console.log(`Processing filename: ${file}`);
        }
        buffer += fs.readFileSync(file) + '\n';
    }

    // output combined file
    const mainFile = path.join(outputDir, 'main.js');
    fs.writeFileSync(mainFile, buffer, { flag: 'w+' });

    const outputFile = path.join(outputDir, 'main.min.js');

    // 2. Execute minifying steps
    // 2a. closureCompilerStep
    // The Closure Compiler parses, analyses, and compiles js to produce optimized code.
    // I think it does deeper/more thoughtful analysis than uglify and does more advanced optimizations.
    console.log('Running Closure Compiler...');
    child_process.execSync(`npx google-closure-compiler --js=${mainFile} --js_output_file=${outputFile} --compilation_level=SIMPLE --warning_level=VERBOSE --jscomp_off=* --assume_function_wrapper`, { stdio: 'inherit' });

    // 2b. uglifyBuildStep
    // uglifyJS is a JavaScript minifier that compresses js code even further
    // It does a lot of stuff, like removing comments (thank god for that am I right lol) and renaming variables
    console.log('Running UglifyJS...');
    child_process.execSync(`npx uglifyjs ${outputFile} -c -m -o ${outputFile}`, { stdio: 'inherit' });

    // 2c. roadrollerBuildStep
    // roadroller was made for js13k games! :)
    // it apparently is more resource-intensive, so it's good for instances like these where the main focus is minifying to the max!
    console.log('Running Roadroller...');
    child_process.execSync(`npx roadroller ${outputFile} -o ${outputFile}`, { stdio: 'inherit' });

    // 4. zipBuildStep (this isn't a part of the littleJS engine, btw!!)
    console.log('Zipping the game...');
    // delete a zip file if it exists
    if (fs.existsSync('dist/game.zip')) {
        fs.unlinkSync('dist/game.zip');
    } else {
        // make the dist folder if it doesn't exist
        fs.mkdirSync('dist', { recursive: true });
    }

    // 5. Inlining scripts in a new html file

    // Move the index.html file to the build folder
    fs.copyFileSync('src/index.html', 'build/index.html');

    // inline <script> tags
    const html = fs.readFileSync('build/index.html', 'utf8');
    // TODO: testing with the unminified version. update to min!
    // const finalScript = 'main.js'; // main.min.js
    const fullScript =  fs.readFileSync(path.join(outputDir, 'main.min.js'), 'utf8');
    const inlineScript = `<script>${fullScript}</script>`;
    const newHtml = html.replace(
        /<!--\s*inline-start\s*-->[\s\S]*?<!--\s*inline-end\s*-->/,
        `<!-- inline-start -->\n${inlineScript}\n<!-- inline-end -->`
    );
    // overwrite index.html
    fs.writeFileSync('build/index.html', newHtml, 'utf8');

    // also make a copy for the root folder for github deployment :) 
    fs.writeFileSync('index.html', newHtml, 'utf8');

    // 6. Zip it up

    // use bestzip to create a zip file
    child_process.execSync('npx bestzip dist/game.zip build/index.html', { stdio: 'inherit' });

    // this will recompress the zip and make it even smaller! (hopefully)
    child_process.execFile(advzipBin, ['--recompress', '--shrink-extra', 'dist/game.zip'], err => {
        console.log('ZIP file successfully minified with advzip!');
    });

    // 6. zip size check step
    // statSync() method synchronously returns info about the given file path.
    const size = fs.statSync('dist/game.zip').size;
    const maxSize = 13312
    console.log(`Size is: ${size} bytes (max is ${maxSize})`);
    const diff = size - maxSize;
    console.log("-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-");

    if (diff > 0) {
        console.log(`Aw man you have ${diff} bytes too many!`);
    } else {
        console.log(`You are ${-diff} bytes under the limit!`);
    }
    console.log("-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-_-");


} catch (err) {
    console.error('Error zipping:', err);
}
