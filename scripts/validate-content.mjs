import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, QUESTION_BANK } from '../src/data/catalog.js';
import { CHARACTER_DB } from '../src/data/characters.js';
import { validateCharacterCatalog, validateQuestionBank } from '../src/core/content-validator.js';

const questionReport = validateQuestionBank(QUESTION_BANK, CONFIG);
const characterReport = validateCharacterCatalog(CHARACTER_DB);
const missingImages = QUESTION_BANK
  .filter((question) => question.imageSrc)
  .map((question) => ({
    id: question.id,
    file: path.resolve('public', question.imageSrc.replace(/^\.\/assets\//, 'assets/')),
  }))
  .filter(({ file }) => !fs.existsSync(file));

if (questionReport.warnings.length) {
  console.warn(questionReport.warnings.join('\n'));
}
if (!questionReport.pass || !characterReport.pass || missingImages.length) {
  const messages = [
    ...questionReport.errors,
    ...characterReport.errors,
    ...missingImages.map(({ id, file }) => `题目 #${id} 的图片不存在: ${file}`),
  ];
  console.error(messages.join('\n'));
  process.exit(1);
}

console.log(`内容校验通过：${QUESTION_BANK.length} 道题，${CHARACTER_DB.length} 个角色。`);
