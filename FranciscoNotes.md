 To locally run OHIF
APP_CONFIG=config/demoEMT.js yarn run dev

# To compile
APP_CONFIG=config/cspacs.js yarn run build
APP_CONFIG=config/demoEMT.js yarn run build
APP_CONFIG=config/showcaseEMT.js yarn run build

# To upload to server
- delete the platform/viewer/dist folder
rm -rf platform/viewer/dist
- compile the corresponding case
- Open Microsoft Azure Storage Explorer
- upload inside the corresponding Blob Containers/$web folder

this file referenced by APP_CONFIG is in `./platform/viewer/public/config` 
# To patch
follow this link: https://dev.to/zhnedyalkow/the-easiest-way-to-patch-your-npm-package-4ece
in short:
- Christian forked and modified the dicomweb-client library, and then registered
  by creating a link to it inside (aparently, stored in .config)
  Once the link is created via "yarn link dicomweb-client", then it is enough
  to execute - yarn install
- I created a patch to a repository using the patch-package node_module, 
  and by setting it to "postinstall" inside package.json
- it is also installed using yarn install. These two do not conflict
- Avoid "npm install", this will overwrite the linked package and undo the changes.
# patch locations
- These are inside /patch, these are being tracked by git.
