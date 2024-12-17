# @opentranslate/niu

[![npm-version](https://img.shields.io/npm/v/@opentranslate/niu.svg)](https://www.npmjs.com/package/@opentranslate/niu)

Niu translator with [OpenTranslate](https://github.com/OpenTranslate) API.

## Installation

### Yarn

```
yarn add @opentranslate/niu
```

### NPM

```
npm i @opentranslate/niu
```

## Usage

```typescript
import Niu from '@opentranslate/niu'

const niu = new Niu({
  token: 'YOUR_TOKEN'
  //please refer to https://fanyi.niuapp.com/#/api
})

niu.translate('text').then(console.log)
```

## API

See [translator](https://github.com/OpenTranslate/OpenTranslate/blob/master/packages/translator/README.md) for more details.

## Disclaimer

The material and source code from this package are for study and research purposes only. Any reliance you place on such material or source code are strictly at your own risk.
