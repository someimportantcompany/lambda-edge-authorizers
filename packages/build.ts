import assert from 'assert';
import dotenv from 'dotenv';
import fs from 'fs';
import minimist from 'minimist';
import path from 'path';
import * as esbuild from 'esbuild';

(async () => {
  const { i: infile, o: outfile } = minimist(process.argv.slice(2), { string: ['i', 'o'] });
  assert(typeof infile === 'string', 'Expected infile to be a string');
  assert(typeof outfile === 'string', 'Expected outfile to be a string');
  assert(infile.endsWith('.js') || infile.endsWith('.ts'), 'Expected infile to end with `.js`/`.ts`');
  assert(outfile.endsWith('.js'), 'Expected outfile to end with `.js`');

  let define = {};
  const envFilePath = path.resolve(process.env.PWD!, '.env.example');
  // console.log(envFilePath);
  if (fs.existsSync(envFilePath)) {
    const envKeys = Object.keys(dotenv.parse(fs.readFileSync(envFilePath, 'utf8')));
    define = Object.fromEntries(envKeys
      .filter(key => typeof process.env[key] === 'string')
      .map(key => [`process.env.${key}`, `"${process.env[key]!}"`]));
    // console.log(define),
  }

  await esbuild.build({
    entryPoints: [ path.resolve(process.env.PWD!, infile) ],
    outfile: path.resolve(process.env.PWD!, outfile),
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    define,
  });
})();
