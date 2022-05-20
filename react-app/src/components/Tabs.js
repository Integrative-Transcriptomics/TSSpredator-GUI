import React, { useState } from "react";
import TextFieldGroup from './TextFieldGroup';
import UploadFilesIndividually from './UploadFilesIndividually';
import PopupWindow from "./PopupWindow";

/** creates the genome and replicate tabs
 * 
 * @param genomes: array with all genomes that need a tab -> genome saved as Objekt
 * @param genome: true <=> create genome tab, false <=> create replicate tab
 * @param replicates: array with all replicates that need a tab -> replicate saved as Objekt
 * @param whichGenome: for creating repicate tab -> genome index: in which genome tab the replicate is found
 * @param studyType: 'condition' or 'genome'
 * @param handleTabs: function to handle input in text fields for the genome tabs
 * @param numRep: number of replicates
 * @param saveFiles: function to handle multiple uploaded files
 * @param saveIndividualFile: saves an individual file
 */

function Tabs({ genomes, genome, replicates, whichGenome, studyType, handleTabs, numRep, saveFiles, saveIndividualFile }) {

  // current active tab
  const [state, setState] = useState(1);

  // popup windows to upload all files together
  const [popup, setPopup] = useState(false);

  // names of the files that need to be uploaded
  let fileNames;
  if (genome) {
    fileNames = [{ "name": "Genome FASTA", "value": "Genome FASTA" }, { "name": "Genome Annotation", "value": "Genome Annotation" }]
  } else {
    fileNames = [{ "name": "enriched forward", "value": "enriched forward" }, { "name": "enriched reverse", "value": "enriched reverse" },
    { "name": "normal forward", "value": "normal forward" }, { "name": "normal reverse", "value": "normal reverse" }]
  }

  return (
    <>
      {popup && <PopupWindow closePopup={(e) => setPopup(!popup)} numRep={numRep} saveAllFiles={(g, ef, er, nf, nr) => saveFiles(g, ef, er, nf, nr, state -1)}/>}

      <div className='container'>
        <div className='tab-row'>
        {genome ? <></> :  <div className='left-line'></div>}
       
          {genomes.map((g, i) => {
            return (
              <div className={state === (i + 1) ? 'tab tab-active' : 'tab'} key={(i + 1)} onClick={() => { setState((i + 1)) }}>

                {genome ? <input className={state === (i + 1) ? 'tab-input tab-input-active' : 'tab-input'} type="text" id={i} name="name"
                  placeholder={genomes[i]['genome' + (i + 1)].placeholder} onChange={(e) => handleTabs(e)} />
                  : "Replicate " + String.fromCharCode(97 + i)}
              </div>
            )
          })
          }
          <div className="line"></div>
        </div>
        <div className={genome ? 'tab-content content-border' : 'tab-content'}>
         
          {genomes.map((g, i) => {
            return (
              <div className={state === (i + 1) ? 'content content-active' : 'content'} key={(i + 1)}>

                {genome ? <><TextFieldGroup fields={[{ "name": "Alignment ID" }, { "name": "Output ID" }]} studyType={studyType} id={i} handleTabs={(e) => handleTabs(e)} />
                  <button className="button all-files" type='button' onClick={() => setPopup(!popup)}>Upload Files together</button>
                  <UploadFilesIndividually files={fileNames} studyType={studyType} id={i} genomes={genomes} handleTabs={(e) => handleTabs(e)} 
                                            saveIndividualFile={(e) => saveIndividualFile(e)} />
                  <Tabs genomes={replicates[i]['genome' + (i + 1)]} genome={false} whichGenome={i} handleTabs={(e) => handleTabs(e)}
                        saveIndividualFile={(e) => saveIndividualFile(e)}/>
                </>
                  : <UploadFilesIndividually files={fileNames} id={[whichGenome, i]} genomes={genomes} handleTabs={(e) => handleTabs(e)} 
                                             saveIndividualFile={(e) => saveIndividualFile(e)}/>}
              </div>
            )
          })
          }
        </div>
      </div>
    </>
  )
}

export default Tabs