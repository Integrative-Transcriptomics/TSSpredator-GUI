import React from 'react';


/** individual button for uploading a file 
 * 
 * @param file: object -> field name 
 * @param id: id des Genom/Replicate Tabs
 * @param studyType: 'condtion' oder 'genome'
 * @param saveIndividualFile: saves selected file
 * @param saveAnnotationFile: saves annotation files
 */
function UploadFile({ file, id, studyType, genomes, saveIndividualFile, show, saveAnnotationFile }) {

  let disabled = false;
  if (studyType === 'condition' && id > 0) {
    disabled = true;
  }

  const label = (file.name).toLowerCase().replace(' ', '');

  let fileName;
  let gIdx;
  let rIdx;
  // for replicate tab
  if (Array.isArray(id)) {
    rIdx = id[1];
    let rep = "replicate" + String.fromCharCode(97 + rIdx)
    fileName = genomes[rIdx][rep][label].name;

    // for genome files
  } else {
    gIdx = id;
    if (label === 'genomeannotation') {
      // multiple filenames possible -> go over array
      const fileArray = genomes[gIdx]['genome' + (gIdx + 1)][label];

      if (fileArray.length > 0) {
        fileName = '';
        // less than 5 files, show all file names
        if(fileArray.length < 5) {
          fileArray.forEach(file => {
            fileName += file.name + ', '
          });
          // remove last comma
          fileName = fileName.slice(0, -2);

        // more than 5 files, show only first 5 file names
        } else {
          for(let i = 0; i < 5; i++) {
            fileName += fileArray[i].name + ', ';
          }
          fileName += '...'
        }
   
      }
    } else {
      fileName = genomes[gIdx]['genome' + (gIdx + 1)][label].name;
    }
  }

  if (label === 'genomeannotation') {
    return (
      <div className={show ? 'file-box' : 'hidden'} title={file.tooltip}>
        <p className='file-row'>{file.name}</p>
        <label className='element-row file-row'>

          <input disabled={disabled} className='element' type='file' name={label} id={id + 'annfile'} style={{ display: 'none' }}
            onChange={(e) => saveAnnotationFile(e)} directory=""
            webkitdirectory=""  />

          <p className={disabled ? 'button disabled' : 'button'}>Select Folder</p>
          {typeof fileName === 'undefined' ? <div className='file-name'>No file(s) selected.</div> 
                                           : <div className='file-name'> {fileName}</div>}
        </label>
      </div>
    )
  } else {
    return (
      <div className={show ? 'file-box' : 'hidden'} title={file.tooltip}>
        <p className='file-row'>{file.name}</p>
        <label className='element-row file-row'>

          <input disabled={disabled} className='element' type="file" name={label} id={id + 'file'} style={{ display: 'none' }}
            onChange={(e) => saveIndividualFile(e)} />

          <p className={disabled ? 'button disabled' : 'button'}>Select File</p>
          {typeof fileName === 'undefined' ? <p className='file-name'>No file selected.</p> : <p className='file-name'>{fileName}</p>}
        </label>
      </div>
    )
  }

}

export default UploadFile