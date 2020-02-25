const { readJSONSync, readFileSync, existsSync, mkdirSync, mkdirpSync, writeFileSync } = require('fs-extra');
const { join, dirname } = require('path');
const compiler = require('@ali/jsx2qa-compiler');
const { getOptions } = require('loader-utils');
const chalk = require('chalk');
const PrettyError = require('pretty-error');
const moduleResolve = require('./utils/moduleResolve');
const { removeExt } = require('./utils/pathHelper');
const eliminateDeadCode = require('./utils/dce');
const defaultStyle = require('./defaultStyle');
const processCSS = require('./styleProcessor');
const output = require('./output');
const adaptAppConfig = require('./adaptAppConfig');

const pe = new PrettyError();

function createImportStatement(req) {
  return `import '${req}';`;
}

function generateDependencies(dependencies) {
  return Object
    .keys(dependencies)
    .map(mod => createImportStatement(mod))
    .join('\n');
}

function getRelativePath(filePath) {
  let relativePath;
  if (filePath[0] === '/') {
    relativePath = `.${filePath}`;
  } else if (filePath[0] === '.') {
    relativePath = filePath;
  } else {
    relativePath = `./${filePath}`;
  }
  return relativePath;
}

module.exports = async function appLoader(content) {
  const loaderOptions = getOptions(this);
  const { entryPath, platform, mode, disableCopyNpm, turnOffSourceMap } = loaderOptions;
  const appConfigPath = removeExt(this.resourcePath) + '.json';
  const rawContent = readFileSync(this.resourcePath, 'utf-8');
  const config = readJSONSync(appConfigPath);

  const outputPath = this._compiler.outputPath;
  if (!existsSync(outputPath)) mkdirSync(outputPath);

  const sourcePath = join(this.rootContext, entryPath);

  const compilerOptions = Object.assign({}, compiler.baseOptions, {
    resourcePath: this.resourcePath,
    outputPath,
    sourcePath,
    platform,
    type: 'app',
    sourceFileName: this.resourcePath,
    disableCopyNpm,
    turnOffSourceMap
  });
  const rawContentAfterDCE = eliminateDeadCode(rawContent);

  let transformed;
  try {
    transformed = compiler(rawContentAfterDCE, compilerOptions);
  } catch (e) {
    console.log(chalk.red(`\n[Miniapp ${platform.type}] Error occured when handling App ${this.resourcePath}`));
    console.log(pe.render(e));
    return '';
  }

  const { style, assets } = await processCSS(transformed.cssFiles, sourcePath);
  transformed.style = style;
  transformed.assets = assets;

  this.addDependency(appConfigPath);

  const transformedAppConfig = transformAppConfig(entryPath, config, platform.type);

  const outputContent = {
    code: transformed.code,
    map: transformed.map,
    config: `module.exports = ${JSON.stringify(config, null, 2)}`,
    css: transformed.style ? defaultStyle + transformed.style : defaultStyle,
    json: transformedAppConfig
  };
  const outputOption = {
    outputPath: {
      code: join(outputPath, 'app.ux'),
      json: join(outputPath, 'app.json'),
      css: join(outputPath, 'app' + platform.extension.css),
      config: join(outputPath, 'appConfig.js')
    },
    mode,
    type: 'app'
  };
  output(outputContent, rawContent, outputOption);
  // copy iconfont todo
  transformIcon(config, this.resourcePath, outputPath)

  return [
    `/* Generated by JSX2MP AppLoader, sourceFile: ${this.resourcePath}. */`,
    generateDependencies(transformed.imported),
  ].join('\n');
};

function transformIcon(config, resourcePath, outputPath) {
  if (!config.iconfont) return;
  const iconPath = join(resourcePath, '../', config.iconfont);
  const iconTargetPath = join(outputPath, config.iconfont);
  const iconFile = readFileSync(iconPath);
  writeFileWithDirCheck(iconTargetPath, iconFile);
}

/**
 * mkdir before write file if dir does not exist
 * @param {string} filePath
 * @param {string|Buffer|TypedArray|DataView} content
 * @param {string}  [type=file] 'file' or 'json'
 */
function writeFileWithDirCheck(filePath, content, type = 'file') {
  const dirPath = dirname(filePath);
  if (!existsSync(dirPath)) {
    mkdirpSync(dirPath);
  }
  if (type === 'file') {
    writeFileSync(filePath, content);
  } else if (type === 'json') {
    writeJSONSync(filePath, content, { spaces: 2 });
  }
}

function transformAppConfig(entryPath, originalConfig, platform) {
  const config = {};
  for (let key in originalConfig) {
    const value = originalConfig[key];

    switch (key) {
      case 'routes':
        const pages = [];
        if (Array.isArray(value)) {
          // Only resolve first level of routes.
          value.forEach(({ component, source, targets }) => {
            // Compatible with old version definition of `component`.
            if (!Array.isArray(targets)) {
              pages.push(moduleResolve(entryPath, getRelativePath(source || component)));
            }
            if (Array.isArray(targets) && targets.indexOf('miniapp') > -1) {
              pages.push(moduleResolve(entryPath, getRelativePath(source || component)));
            }
          });
        }
        config.pages = pages;
        break;
      case 'window':
        adaptAppConfig(value, 'window', platform);
        config[key] = value;
        break;
      case 'tabBar':
        if (value.items) {
          adaptAppConfig(value, 'items', platform);
        }
        adaptAppConfig(value, 'tabBar', platform);
        config[key] = value;
        break;
      default:
        config[key] = value;
        break;
    }
  }

  return config;
}