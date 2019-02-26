# arc-data-server

An http interface for exported json-files from [BigPaua's Arc App](https://www.bigpaua.com/arcapp/privacy).

The json-exports are accessed and staged through multiple layers:

1. iCloud Directory (if available)
1. Exported (and extracted) json files
1. Enriched Data (details to follow)

The intention is to provide a base for further analysis of the data.

## Endpoints
* [`/layer2/files`](http://localhost:3000/layer2/files) Lists all files on Layer 2

## Commands
### Installation
`npm install`

### Run in Devmode
`npm run dev`