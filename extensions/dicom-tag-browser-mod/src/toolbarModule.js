const TOOLBAR_BUTTON_TYPES = {
  COMMAND: 'command',
};

const definitions = [
  {
    id: 'TagBrowserMod',
    label: 'Tag Browser',
    icon: 'list',
    //
    type: TOOLBAR_BUTTON_TYPES.COMMAND,
    commandName: 'openDICOMTagViewerMod',
    context: 'VIEWER',
  },
];

export default {
  definitions,
  defaultContext: 'VIEWER',
};
