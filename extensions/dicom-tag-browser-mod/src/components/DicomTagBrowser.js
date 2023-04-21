import React, { useState, useEffect } from 'react';
import { classes, cornerstone as OHIFCornerstone } from '@ohif/core';
import { Range } from '@ohif/ui';
import dcmjs from 'dcmjs';
import DicomBrowserSelect from './DicomBrowserSelect';
import moment from 'moment';
import './DicomTagBrowser.css';
import DicomBrowserSelectItem from './DicomBrowserSelectItem';
// Modded parts
import './mod.css'; // css of the modded version
import deleteInstances from './DicomDeleteInstances';

const { ImageSet } = classes;
const { DicomMetaDictionary } = dcmjs.data;
const { nameMap } = DicomMetaDictionary;

const { metadataProvider } = OHIFCornerstone;

// Variable to gray out the delete button after deletion
let deletedMemory = [];

const DicomTagBrowser = ({ displaySets, displaySetInstanceUID, DicomWebClient }) => {
  const [
    activeDisplaySetInstanceUID,
    setActiveDisplaySetInstanceUID,
  ] = useState(displaySetInstanceUID);
  const [activeInstance, setActiveInstance] = useState(1);
  const [tags, setTags] = useState([]);
  const [meta, setMeta] = useState('');
  const [instanceList, setInstanceList] = useState([]);
  const [displaySetList, setDisplaySetList] = useState([]);
  const [isImageStack, setIsImageStack] = useState(false);

  useEffect(() => {
    const activeDisplaySet = displaySets.find(
      ds => ds.displaySetInstanceUID === activeDisplaySetInstanceUID
    );

    const newDisplaySetList = displaySets.map(displaySet => {
      const {
        displaySetInstanceUID,
        SeriesDate,
        SeriesTime,
        SeriesNumber,
        SeriesDescription,
        Modality,
      } = displaySet;

      /* Map to display representation */
      const dateStr = `${SeriesDate}:${SeriesTime}`.split('.')[0];
      const date = moment(dateStr, 'YYYYMMDD:HHmmss');
      const displayDate = date.format('ddd, MMM Do YYYY');

      return {
        value: displaySetInstanceUID,
        title: `${SeriesNumber} (${Modality}): ${SeriesDescription}`,
        description: displayDate,
        onClick: () => {
          setActiveDisplaySetInstanceUID(displaySetInstanceUID);
          setActiveInstance(1);
        },
      };
    });

    let metadata;
    const isImageStack =
      activeDisplaySet instanceof ImageSet &&
      activeDisplaySet.isSOPClassUIDSupported === true;

    let instanceList;

    if (isImageStack) {
      const { images } = activeDisplaySet;
      const image = images[activeInstance - 1];

      instanceList = images.map((image, index) => {
        const metadata = image.getData().metadata;

        const { InstanceNumber } = metadata;

        return {
          value: index,
          title: `Instance Number: ${InstanceNumber}`,
          description: '',
          onClick: () => {
            setActiveInstance(index);
          },
        };
      });

      metadata = image.getData().metadata;
    } else {
      metadata = activeDisplaySet.metadata;
    }

    setTags(getSortedTags(metadata));
    setMeta(metadata);
    setInstanceList(instanceList);
    setDisplaySetList(newDisplaySetList);
    setIsImageStack(isImageStack);
  }, [activeDisplaySetInstanceUID, activeInstance, displaySets]);

  const selectedDisplaySetValue = displaySetList.find(
    ds => ds.value === activeDisplaySetInstanceUID
  );

  let instanceSelectList = null;

  if (isImageStack) {
    instanceSelectList = (
      <div className="dicom-tag-browser-instance-range">
        <Range
          showValue
          step={1}
          min={1}
          max={instanceList.length}
          value={activeInstance}
          valueRenderer={value =>
              <div className="dicom-instance-group">
              <p className="dicom-tag-browser-num">
              Instance Number: {tags.find(tag => tag.tag == "(0020,0013)").value}
              </p>
              <DeleteButton tags={tags} DicomWebClient={DicomWebClient}/>
              </div>
          }
          onChange={({ target }) => {
            const instanceIndex = parseInt(target.value);
            setActiveInstance(instanceIndex);
          }}
        />
      </div>
    );
  } else { // if there is no slider, keep the delete button
      instanceSelectList = 
          (<div className="dicom-instance-group">
              <DeleteButton tags={tags} DicomWebClient={DicomWebClient}/>
          </div>);
  }

  return (
    <div className="dicom-tag-browser-content">
      <DicomBrowserSelect
        value={selectedDisplaySetValue}
        formatOptionLabel={DicomBrowserSelectItem}
        options={displaySetList}
      />
      {instanceSelectList}
      <div className="dicom-tag-browser-table-wrapper">
        <DicomTagTable tags={tags} meta={meta}></DicomTagTable>
      </div>
    </div>
  );
};

function DicomTagTable({ tags, meta }) {
  const rows = getFormattedRowsFromTags(tags, meta);

  return (
    <table className="dicom-tag-browser-table">
      <tbody>
        <tr>
          <th className="dicom-tag-browser-table-left">Tag</th>
          <th className="dicom-tag-browser-table-left">Value Representation</th>
          <th className="dicom-tag-browser-table-left">Keyword</th>
          <th className="dicom-tag-browser-table-left">Value</th>
        </tr>
        {rows.map((row, index) => {
          const className = row.className ? row.className : null;

          return (
            <tr className={className} key={`DICOMTagRow-${index}`}>
              <td>{row[0]}</td>
              <td className="dicom-tag-browser-table-center">{row[1]}</td>
              <td>{row[2]}</td>
              <td>{row[3]}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function getFormattedRowsFromTags(tags, meta) {
  //computePerpendicularPosition(tags);  // TODO: take out or fix
  const rows = [];

  tags.forEach(tagInfo => {
    if (tagInfo.tag == "(0020,0037)") {
        rows.push(['--->',
        '', 'perpendicularPosition', `${computePerpendicularPosition(tags)}`]);
    }
    if (tagInfo.vr === 'SQ') {
      rows.push([
        `${tagInfo.tagIndent}${tagInfo.tag}`,
        tagInfo.vr,
        tagInfo.keyword,
        '',
      ]);

      const { values } = tagInfo;

      values.forEach((item, index) => {
        const formatedRowsFromTags = getFormattedRowsFromTags(item);

        rows.push([
          `${item[0].tagIndent}(FFFE,E000)`,
          '',
          `Item #${index}`,
          '',
        ]);

        rows.push(...formatedRowsFromTags);
      });
    } else {
      if (tagInfo.vr === 'xs') {
        try {
          const dataset = metadataProvider.getStudyDataset(
            meta.StudyInstanceUID
          );
          const tag = dcmjs.data.Tag.fromPString(tagInfo.tag).toCleanString();
          const originalTagInfo = dataset[tag];
          tagInfo.vr = originalTagInfo.vr;
        } catch (error) {
          console.error(
            `Failed to parse value representation for tag '${tagInfo.keyword}'`
          );
        }
      }

      rows.push([
        `${tagInfo.tagIndent}${tagInfo.tag}`,
        tagInfo.vr,
        tagInfo.keyword,
        tagInfo.value,
      ]);
    }
  });

  return rows;
}

function getSortedTags(metadata) {
  const tagList = getRows(metadata);

  // Sort top level tags, sequence groups are sorted when created.
  _sortTagList(tagList);

  return tagList;
}

function getRows(metadata, depth = 0) {
  // Tag, Type, Value, Keyword

  const keywords = Object.keys(metadata);

  let tagIndent = '';

  for (let i = 0; i < depth; i++) {
    tagIndent += '>';
  }

  if (depth > 0) {
    tagIndent += ' '; // If indented, add a space after the indents.
  }

  const rows = [];

  for (let i = 0; i < keywords.length; i++) {
    let keyword = keywords[i];

    if (keyword === '_vrMap') {
      continue;
    }

    const tagInfo = nameMap[keyword];

    let value = metadata[keyword];

    if (tagInfo && tagInfo.vr === 'SQ') {
      const sequenceAsArray = toArray(value);

      // Push line defining the sequence

      const sequence = {
        tag: tagInfo.tag,
        tagIndent,
        vr: tagInfo.vr,
        keyword,
        values: [],
      };

      rows.push(sequence);

      if (value === null) {
        // Type 2 Sequence
        continue;
      }

      sequenceAsArray.forEach(item => {
        const sequenceRows = getRows(item, depth + 1);

        if (sequenceRows.length) {
          // Sort the sequence group.
          _sortTagList(sequenceRows);
          sequence.values.push(sequenceRows);
        }
      });

      continue;
    }

    if (Array.isArray(value)) {
      value = value.join('\\');
    }

    if (typeof value === 'number') {
      value = value.toString();
    }

    if (typeof value !== 'string') {
      if (value === null) {
        value = ' ';
      } else {
        if (typeof value === 'object') {
          if (value.InlineBinary) {
            value = 'Inline Binary';
          } else if (value.BulkDataURI) {
            value = `Bulk Data URI`; //: ${value.BulkDataURI}`;
          } else if (value.Alphabetic) {
            value = value.Alphabetic;
          } else {
            console.warn(`Unrecognised Value: ${value} for ${keyword}:`);
            console.warn(value);
            value = ' ';
          }
        } else {
          console.warn(`Unrecognised Value: ${value} for ${keyword}:`);
          value = ' ';
        }
      }
    }

    // tag / vr/ keyword/ value

    // Remove retired tags
    keyword = keyword.replace('RETIRED_', '');

    if (tagInfo) {
      rows.push({
        tag: tagInfo.tag,
        tagIndent,
        vr: tagInfo.vr,
        keyword,
        value,
      });
    } else {
      // Private tag
      const tag = `(${keyword.substring(0, 4)},${keyword.substring(4, 8)})`;

      rows.push({
        tag,
        tagIndent,
        vr: '',
        keyword: 'Private Tag',
        value,
      });
    }
  }

  return rows;
}

function toArray(objectOrArray) {
  return Array.isArray(objectOrArray) ? objectOrArray : [objectOrArray];
}

function _sortTagList(tagList) {
  tagList.sort((a, b) => {
    if (a.tag < b.tag) {
      return -1;
    }

    return 1;
  });
}

function getValue(tag) {
    if (tag) {
        return tag.value;
    }
    else {
        return "undefined";
    }
}


function deleteAction(DicomWebClient, tags) {
    let StudyInstanceUID = getValue(tags.find(tag => tag.tag == "(0020,000D)"));
    let SeriesInstanceUID = getValue(tags.find(tag => tag.tag == "(0020,000E)"));
    let SOPInstanceUID = getValue(tags.find(tag => tag.tag == "(0008,0018)"));
    let SeriesNumber = getValue(tags.find(tag => tag.tag == "(0020,0011)"));
    let InstanceNumber = getValue(tags.find(tag => tag.tag == "(0020,0013)"));
    let Modality = getValue(tags.find(tag => tag.tag == "(0008,0060)"));
    let SeriesDescription = getValue(tags.find(tag => tag.tag == "(0008,103E)"));
    let confirmationMsg = (  "Are you sure you want to delete the instance\n"
                           + `Series number: ${SeriesNumber},`
                           + `    Modality: ${Modality}\n`
                           + `Series description: ${SeriesDescription}\n`
                           + `Instance number: ${InstanceNumber}`
                          );
    if (confirm(confirmationMsg)) {
        deleteInstances(DicomWebClient, 
                        {StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID});
        deletedMemory.push({StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID});
        let button = document.getElementById("tag-browser-delete-button");
        button.className = "dicom-tag-browser-instance-delete-disabled";
        button.innerHTML = "deleted";
        button.disabled = true;
    }
}

function isDeleted(tags) {
    if (tags.length > 0) {
        let StudyInstanceUID = getValue(tags.find(tag => tag.tag == "(0020,000D)"));
        let SeriesInstanceUID = getValue(tags.find(tag => tag.tag == "(0020,000E)"));
        let SOPInstanceUID = getValue(tags.find(tag => tag.tag == "(0008,0018)"));
        var match = deletedMemory.find(
                             del => (   del.StudyInstanceUID == StudyInstanceUID
                           && del.SeriesInstanceUID == SeriesInstanceUID
                           && del.SOPInstanceUID == SOPInstanceUID))
        if (match) {
            return true;
        } else {
            return false;
        }
    } else {
        return false;
    }
}

// Renders a button that deactivates if the instance was already deleted
function DeleteButton ({tags, DicomWebClient}) {
    if (isDeleted(tags)) {
        return (
            <button id="tag-browser-delete-button"
                    className="dicom-tag-browser-instance-delete-disabled">
                deleted
            </button>);
    } else {
        return (
            <button id="tag-browser-delete-button"
                    className="dicom-tag-browser-instance-delete"
                    onClick={()=>deleteAction(DicomWebClient, tags)}
                    disabled={false}>
                delete&nbsp;
            </button>);
    }
}

// Section to obtain the true thickness
function computePerpendicularPosition(tags) {
    let ImagePosition = getValue(tags.find(tag => tag.tag == "(0020,0032)"));
    let ImageOrientation = getValue(tags.find(tag => tag.tag == "(0020,0037)"));
    let positions = ImagePosition.split("\\").map(parseFloat);
    let orientations = ImageOrientation.split("\\").map(parseFloat);
    // We need the perpendicular vector to the orientations.
    let crossProduct = [
        orientations[1]*orientations[5] - orientations[2]*orientations[4],
        orientations[2]*orientations[3] - orientations[0]*orientations[5],
        orientations[0]*orientations[4] - orientations[1]*orientations[3]
    ];
    // We project the position along this direction
    return    positions[0]*crossProduct[0]
            + positions[1]*crossProduct[1]
            + positions[2]*crossProduct[2];
}

export default DicomTagBrowser;
