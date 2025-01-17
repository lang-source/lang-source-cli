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

import { GenerateTranslations } from './generate-translations';
import inquirer from 'inquirer';
import fs from 'fs';
import { Command } from 'commander';
import { logger } from '../utils';
import axios from 'axios';
import path from 'path';
import figlet from 'figlet';
import https from 'https';
import dotenv from 'dotenv';

/**
 * CLI for Langsource to handle translation generation.
 *
 * @class LangsourceCLI
 * @description This class sets up and manages the CLI tool for generating translations.
 */
class LangsourceCLI {
  private readonly languages: Map<string, string>;
  private readonly process: Command;

  /**
   * Constructs a new instance of the LangsourceCLI class.
   */
  constructor() {
    this.languages = GenerateTranslations.supportedLanguagesText;
    this.process = new Command();
  }

  /**
   * Prompts the user to select a language to generate translations for.
   * @returns {string} The selected language code.
   */
  private async selectLanguages(): Promise<string[]> {
    // allow the user to select multiple languages
    const languageChoices = Array.from(this.languages).map(([code, name]) => ({
      name: name,
      value: code,
    }));

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'languages',
        default: Array.from(this.languages.keys()),
        message: 'Select the languages you want to generate translations for:',
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
  }

  /**
   * Prompts the user to enter the path
   * @returns {string} The path entered by the user.
   */
  private async getPath(): Promise<string> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Enter the path of the file containing the base translations:',
        validate: (input: string) => {
          if (!input) {
            return 'Please enter a valid path.';
          }
          if (!input.endsWith('.json')) {
            return 'Please enter a valid JSON file.';
          }
          if (!fs.existsSync(input)) {
            return 'The specified path does not exist.';
          }
          return true;
        },
      },
    ]);

    return answers.path;
  }

  /**
   * Reloads the environment variables from the .env file located in the current working directory.
   *
   * @returns {boolean} - Returns `true` if the environment variables were successfully reloaded, otherwise `false`.
   *
   * Logs an error message if the environment variables could not be reloaded.
   */
  private reloadEnv(): boolean {
    const result = dotenv.config({ path: path.join(process.cwd(), '.env') });
    if (result.error) {
      logger.error('Failed to reload environment variables.');
      return false;
    }
    return true;
  }

  /**
   * Prompts the user to enter the LLM API key.
   * @returns {string} The LLM API key entered by the user.
   */
  private async getLLMKey(): Promise<void> {
    if (process.env.LANGSOURCE_API_KEY) {
      const answer = await inquirer.prompt([
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

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'key',
        message: 'Enter your Gemini API key:',
        validate: async (input: string) => {
          if (!input) {
            return 'Please enter a valid API key.';
          }
          return true;
        },
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

    await axios.post(URL, data, { headers }).catch((error) => {
      if (error.response.status === 400) {
        throw new Error('Invalid API Key.');
      }
    });

    const envFilePath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envFilePath)) {
      fs.writeFileSync(envFilePath, '');
    }
    fs.writeFileSync(envFilePath, `LANGSOURCE_API_KEY=${answers.key}`);
    logger.info('API Key Added.');

    if (!this.reloadEnv()) {
      logger.error('Failed to reload environment variables. Please retry.');
      process.exit(1);
    }
  }

  /**
   * Checks if the client is connected to the internet by making a request to a specified host.
   *
   * @returns {Promise<boolean>}
   * A promise that resolves to `true` if the internet connection is available,
   * otherwise resolves to `false`.
   */
  private async isClientConnected(): Promise<boolean> {
    return new Promise((resolve) => {
      const options: https.RequestOptions = {
        host: 'generativelanguage.googleapis.com',
        port: 443,
        timeout: 3000,
      };
      const req = https.request(options, (_) => {
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
  }

  /**
   * Starts the translation generation process.
   */
  public async start(): Promise<void> {
    try {
      if (!(await this.isClientConnected())) {
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
        .action(async () => {
          try {
            console.log(
              figlet.textSync('langsource', {
                font: 'Swamp Land',
                horizontalLayout: 'full',
              }),
            );
            await this.getLLMKey();
            const languages = await this.selectLanguages();
            const path = await this.getPath();
            const generateTranslations = new GenerateTranslations(path);
            await generateTranslations.generateTranslations(languages);
          } catch (error) {
            logger.error((error as Error).message);
          }
        });

      this.process.parse(process.argv);
    } catch (error) {
      logger.error((error as Error).message);
    }
  }
}

export { LangsourceCLI };
