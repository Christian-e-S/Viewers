import { utils } from '@ohif/core';
import React from 'react';
import DicomTagBrowser from './components/DicomTagBrowser';
import { getDicomWebClientFromContext } from './components/DicomUtils';

const { studyMetadataManager } = utils;

export default function getCommandsModule(context, servicesManager) {
  const actions = {
    openDICOMTagViewerMod({ servers, viewports }) {
      const { activeViewportIndex, viewportSpecificData } = viewports;
      const activeViewportSpecificData =
        viewportSpecificData[activeViewportIndex];

      const {
        StudyInstanceUID,
        displaySetInstanceUID,
      } = activeViewportSpecificData;

      const studyMetadata = studyMetadataManager.get(StudyInstanceUID);
      const displaySets = studyMetadata.getDisplaySets();

      const { UIModalService } = servicesManager.services;

      const DicomWebClient = getDicomWebClientFromContext(context, servers);

      const WrappedDicomTagBrowser = function() {
        return (
          <DicomTagBrowser
            displaySets={displaySets}
            displaySetInstanceUID={displaySetInstanceUID}
            DicomWebClient={DicomWebClient}
          />
        );
      };

      UIModalService.show({
        content: WrappedDicomTagBrowser,
        title: `DICOM Tag Browser`,
        fullscreen: true,
        noScroll: true,
      });
    },
  };

  const definitions = {
    openDICOMTagViewerMod: {
      commandFn: actions.openDICOMTagViewerMod,
      storeContexts: ['servers', 'viewports'],
    },
  };

  return {
    actions,
    definitions,
  };
}
