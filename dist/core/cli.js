'use strict';
/**
 * @license MIT
 *
 * Copyright (c) 2025 lang-source
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:npm run check-license

 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.LangsourceCLI = void 0;
const generate_translations_1 = require('./generate-translations');
const inquirer_1 = __importDefault(require('inquirer'));
const fs_1 = __importDefault(require('fs'));
const commander_1 = require('commander');
const utils_1 = require('../utils');
const axios_1 = __importDefault(require('axios'));
const path_1 = __importDefault(require('path'));
const figlet_1 = __importDefault(require('figlet'));
const https_1 = __importDefault(require('https'));
const dotenv_1 = __importDefault(require('dotenv'));
/**
 * CLI for Langsource to handle translation generation.
 *
 * @class LangsourceCLI
 * @description This class sets up and manages the CLI tool for generating translations.
 */
class LangsourceCLI {
  /**
   * Constructs a new instance of the LangsourceCLI class.
   */
  constructor() {
    this.languages =
      generate_translations_1.GenerateTranslations.supportedLanguagesText;
    this.process = new commander_1.Command();
  }
  /**
   * Prompts the user to select a language to generate translations for.
   * @returns {string} The selected language code.
   */
  selectLanguages() {
    return __awaiter(this, void 0, void 0, function* () {
      // allow the user to select multiple languages
      const languageChoices = Array.from(this.languages).map(
        ([code, name]) => ({
          name: name,
          value: code,
        }),
      );
      const answers = yield inquirer_1.default.prompt([
        {
          type: 'checkbox',
          name: 'languages',
          default: Array.from(this.languages.keys()),
          message:
            'Select the languages you want to generate translations for:',
          choices: languageChoices,
          validate(choices) {
            if (choices.length === 0) {
              return 'Please select at least one language.';
            }
            return true;
          },
        },
      ]);
      return answers.languages;
    });
  }
  /**
   * Prompts the user to enter the path
   * @returns {string} The path entered by the user.
   */
  getPath() {
    return __awaiter(this, void 0, void 0, function* () {
      const answers = yield inquirer_1.default.prompt([
        {
          type: 'input',
          name: 'path',
          message:
            'Enter the path of the file containing the base translations:',
          validate: (input) => {
            if (!input) {
              return 'Please enter a valid path.';
            }
            if (!input.endsWith('.json')) {
              return 'Please enter a valid JSON file.';
            }
            if (!fs_1.default.existsSync(input)) {
              return 'The specified path does not exist.';
            }
            return true;
          },
        },
      ]);
      return answers.path;
    });
  }
  /**
   * Reloads the environment variables from the .env file located in the current working directory.
   *
   * @returns {boolean} - Returns `true` if the environment variables were successfully reloaded, otherwise `false`.
   *
   * Logs an error message if the environment variables could not be reloaded.
   */
  reloadEnv() {
    const result = dotenv_1.default.config({
      path: path_1.default.join(process.cwd(), '.env'),
    });
    if (result.error) {
      utils_1.logger.error('Failed to reload environment variables.');
      return false;
    }
    return true;
  }
  /**
   * Prompts the user to enter the LLM API key.
   * @returns {string} The LLM API key entered by the user.
   */
  getLLMKey() {
    return __awaiter(this, void 0, void 0, function* () {
      if (process.env.LANGSOURCE_API_KEY) {
        const answer = yield inquirer_1.default.prompt([
          {
            type: 'confirm',
            name: 'update',
            message: 'Do you want to update the API Key?',
            default: false,
          },
        ]);
        if (!answer.update) {
          return;
        }
      }
      const answers = yield inquirer_1.default.prompt([
        {
          type: 'input',
          name: 'key',
          message: 'Enter your Gemini API key:',
          validate: (input) =>
            __awaiter(this, void 0, void 0, function* () {
              if (!input) {
                return 'Please enter a valid API key.';
              }
              return true;
            }),
        },
      ]);
      const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${answers.key}`;
      const data = {
        contents: [
          {
            parts: [
              {
                text: 'Hello, how are you?',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 100,
        },
      };
      const headers = {
        'Content-Type': 'application/json',
      };
      yield axios_1.default.post(URL, data, { headers }).catch((error) => {
        if (error.response.status === 400) {
          throw new Error('Invalid API Key.');
        }
      });
      const envFilePath = path_1.default.join(process.cwd(), '.env');
      if (!fs_1.default.existsSync(envFilePath)) {
        fs_1.default.writeFileSync(envFilePath, '');
      }
      fs_1.default.writeFileSync(
        envFilePath,
        `LANGSOURCE_API_KEY=${answers.key}`,
      );
      utils_1.logger.info('API Key Added.');
      if (!this.reloadEnv()) {
        utils_1.logger.error(
          'Failed to reload environment variables. Please retry.',
        );
        process.exit(1);
      }
    });
  }
  /**
   * Checks if the client is connected to the internet by making a request to a specified host.
   *
   * @returns {Promise<boolean>}
   * A promise that resolves to `true` if the internet connection is available,
   * otherwise resolves to `false`.
   */
  isClientConnected() {
    return __awaiter(this, void 0, void 0, function* () {
      return new Promise((resolve) => {
        const options = {
          host: 'generativelanguage.googleapis.com',
          port: 443,
          timeout: 3000,
        };
        const req = https_1.default.request(options, (_) => {
          resolve(true);
        });
        req.on('error', (_) => {
          resolve(false);
        });
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });
    });
  }
  /**
   * Starts the translation generation process.
   */
  start() {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        if (!(yield this.isClientConnected())) {
          throw new Error(
            'This package requires internet connection. Please check your internet connection.',
          );
        }
        this.process
          .name('lang-source-cli')
          .version('1.0.5')
          .description(
            'lang-source-cli is an AI-powered tool that simplifies multilingual support by automating i18n, designed to enhance efficiency in globalized development projects.',
          )
          .usage('<command> [options]');
        this.process
          .command('generate')
          .description('Generate translations for supported languages')
          .alias('g')
          .action(() =>
            __awaiter(this, void 0, void 0, function* () {
              try {
                console.log(
                  figlet_1.default.textSync('langsource', {
                    font: 'Swamp Land',
                    horizontalLayout: 'full',
                  }),
                );
                yield this.getLLMKey();
                const languages = yield this.selectLanguages();
                const path = yield this.getPath();
                const generateTranslations =
                  new generate_translations_1.GenerateTranslations(path);
                yield generateTranslations.generateTranslations(languages);
              } catch (error) {
                utils_1.logger.error(error.message);
              }
            }),
          );
        this.process.parse(process.argv);
      } catch (error) {
        utils_1.logger.error(error.message);
      }
    });
  }
}
exports.LangsourceCLI = LangsourceCLI;
