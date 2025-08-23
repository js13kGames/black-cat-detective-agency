import fs from 'node:fs';
import path from 'node:path';
import child_process from 'node:child_process';
import advzipBin from 'advzip-bin';

// This is a simplified and broken down version of the LittleJS Build System so I could figure out how it works!
// TODO: see if the minifying order matters when running steps!?

// make the build folder if it doesn't exist
fs.mkdirSync('build', { recursive: true });

const outputDir = 'build';
const originalDir = 'src';

try {
    const files = fs.readdirSync(originalDir);

    // clear out the build directory
    fs.readdirSync(outputDir).forEach(file => {
        const filePath = path.join(outputDir, file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });

    files.forEach(file => {
        const originalFile = path.join(originalDir, file);
        // make sure the file is a .js file!
        if (path.extname(originalFile) !== '.js') {
            console.log(`Skipping non-js file: ${originalFile}`);
            return;
        } else {
            console.log(`Processing filename: ${file}`);
        }
        const outputFile = path.join(outputDir, file);

        // 1. closureCompilerStep
        // The Closure Compiler parses, analyses, and compiles js to produce optimized code.
        // I think it does deeper/more thoughtful analysis than uglify and does more advanced optimizations.
        console.log('Running Closure Compiler...');
        child_process.execSync(`npx google-closure-compiler --js=${originalFile} --js_output_file=${outputFile} --compilation_level=ADVANCED --warning_level=VERBOSE --jscomp_off=* --assume_function_wrapper`, { stdio: 'inherit' });

        // 2. uglifyBuildStep
        // uglifyJS is a JavaScript minifier that compresses js code even further
        // It does a lot of stuff, like removing comments (thank god for that am I right lol) and renaming variables
        console.log('Running UglifyJS...');
        child_process.execSync(`npx uglifyjs ${outputFile} -c -m -o ${outputFile}`, { stdio: 'inherit' });

        // 3. roadrollerBuildStep
        // roadroller was made for js13k games! :)
        // it apparently is more resource-intensive, so it's good for instances like these where the main focus is minifying to the max!
        console.log('Running Roadroller...');
        child_process.execSync(`npx roadroller ${outputFile} -o ${outputFile}`, { stdio: 'inherit' });

    })
    // TODO: This is where we could further minify by inlining the script in a new html file
    // I'm going to skip that for now because I'm putting css and other metadata in my index.html!
    // I could also just read my existing index.html and then replace that script with an inline one, but I am gonna get that working later.

    // 4. htmlBuildStep
    // console.log('Building HTML...');
    // 
    // // create html file
    // let buffer = '';
    // buffer += '<body>';
    // buffer += '<script>';
    // buffer += fs.readFileSync(filename);
    // buffer += '</script>';

    // // output html file
    // fs.writeFileSync(`${BUILD_FOLDER}/index.html`, buffer, {flag: 'w+'});

    // 5. zipBuildStep (this isn't a part of the littleJS engine, btw!!)
    console.log('Zipping the game...');
    // delete a zip file if it exists
    if (fs.existsSync('dist/game.zip')) {
        fs.unlinkSync('dist/game.zip');
    } else {
        // make the dist folder if it doesn't exist
        fs.mkdirSync('dist', { recursive: true });
    }

    // Move the index.html file to the build folder
    fs.copyFileSync('src/index.html', 'build/index.html');

    // use bestzip to create a zip file
    child_process.execSync('npx bestzip dist/game.zip build', { stdio: 'inherit' });

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
