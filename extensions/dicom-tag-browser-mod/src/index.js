import getCommandsModule from './getCommandsModule';
import toolbarModule from './toolbarModule';
import { version  } from '../package.json';
import { getDicomWebClientFromConfig } from './components/DicomUtils';
/**
 * Constants
 */

/**
 * Globals
 */
const sharedContext = {
    dicomWebClient: null,
}


/**
 * Extension
 */
export default {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id: 'dicom-tag-browser-mod',
  version,

  /**
   * LIFECYCLE HOOKS
   */

  preRegistration({ appConfig, configuration }) {
    const dicomWebClient = getDicomWebClientFromConfig(appConfig);
    if (dicomWebClient) {
      sharedContext.dicomWebClient = dicomWebClient;
    }
  },

  /**
   * MODULE GETTERS
   */
  getCommandsModule({ servicesManager }) {
    return getCommandsModule(sharedContext, servicesManager);
  },
  getToolbarModule() {
    return toolbarModule;
  },
};
