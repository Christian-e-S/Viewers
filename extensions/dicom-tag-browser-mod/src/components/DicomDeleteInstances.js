import OHIF from '@ohif/core';
import { api } from 'dicomweb-client';

/**
 * Constants
 */

/**
 * Public Methods
 */

/**
 * Delete the target DICOM instances in the specified DICOM Web Client
 *
 * @param {DICOMwebClient} dicomWebClient A DICOMwebClient instance through
 *  which the referenced instances will be stored;
 * @param {class} DicomInstance, with properties StudyInstanceUID,
 * SeriesInstanceUID, SOPInstanceUID
 *

 * @param {function} that deletes the input instance
*/

function deleteInstances(DicomWebClient, DicomInstance) {
    const {StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID} = DicomInstance;
    if (DicomWebClient instanceof api.DICOMwebClient) {
        let url = `${DicomWebClient.wadoURL}/studies/${StudyInstanceUID}`;
        url += `/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}`;
        let method = "delete";
        let headers = {};
        let options = {};
        // The DicomWebClient has no inbuilt delete method
        DicomWebClient._httpRequest(url, method, headers, options)
    } else {
        throw new Error('A valid DICOM Web Client instance is expected');
    }
}

export { deleteInstances as default, deleteInstances };
