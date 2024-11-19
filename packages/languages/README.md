# @opentranslate2/languages

[![npm-version](https://img.shields.io/npm/v/@opentranslate2/languages.svg)](https://www.npmjs.com/package/@opentranslate2/languages)
[![OpenTranslate](https://img.shields.io/badge/OpenTranslate-Compatible-brightgreen)](https://github.com/OpenTranslate)

Shared language identifiers and locales for [OpenTranslate](https://github.com/OpenTranslate) projects.

## Usage

### Install

Yarn

```
yarn add @opentranslate2/languages
```

NPM

```
npm i @opentranslate2/languages
```

### Import

CommonJS

```js
const { languages } = require("@opentranslate2/languages");
const en = require("@opentranslate2/languages/locales/en");
const zhCN = require("@opentranslate2/languages/locales/zh-CN");
const zhTW = require("@opentranslate2/languages/locales/zh-TW");
```

TypeScript (with `resolveJsonModule` enabled)

```ts
import { languages } from "@opentranslate2/languages";
import en from "@opentranslate2/languages/locales/en.json";
import zhCN from "@opentranslate2/languages/locales/zh-CN.json";
import zhTW from "@opentranslate2/languages/locales/zh-TW.json";
```

### API

```ts
const langCode = languages[0];
console.log(langCode); //af
console.log(zhCN[langCode]); //南非荷兰语
console.log(en["en"]); //English
```
