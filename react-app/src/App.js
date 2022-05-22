import React, { useState, useEffect } from 'react';
import ParameterGroup from './components/ParameterGroup';
import ParameterAllGroups from './components/ParameterAllGroups';
import Tabs from './components/Tabs';
import './css/Tabs.css';
import './css/App.css';
import './css/Grid.css';
import './css/DragDrop.css';

function App() {

  const [projectName, setProjectName] = useState({});
  const [parameters, setParameters] = useState([{}]);
  const [parameterPreset, setParameterPreset] = useState("default");
  const [rnaGraph, setRnaGraph] = useState(false);
  const [genomes, setGenomes] = useState([{ "genome1": { "name": "Genome 1", "placeholder": "Genome 1", "alignmentid": "", "outputid": "", "genomefasta": "", "genomeannotation": "" } }]);
  const [replicates, setReplicates] = useState([{ "genome1": [{ "replicatea": { "name": "Replicate a", "enrichedforward": "", "enrichedreverse": "", "normalforward": "", "normalreverse": "" } }] }]);
  // wenn neuer Genom Tab hinzugeügt wird: replicateTemplate benutzen um replicates zu updaten
  const [replicateTemplate, setReplicateTemplate] = useState([{ "replicatea": { "name": "Replicate a", "enrichedforward": "", "enrichedreverse": "", "normalforward": "", "normalreverse": "" } }]);
  // template für ein replicate
  const repTemplate = "{\"replicate0\":{\"name\":\"Replicate 0\", \"enrichedforward\":\"\", \"enrichedreverse\":\"\", \"normalforward\":\"\", \"normalreverse\":\"\"}}";
  const [alignmentFile, setAlignmentFile] = useState("");
  // number of replicates
  const [numRep, setnumRep] = useState(1);
  // open/close parameters
  const [showParam, setShowParam] = useState(false);

  /**
   * RUN Button event
   */
  const handleSubmit = (event) => {
    event.preventDefault();
    //console.log(parameters);
    //console.log(parameterPreset);
    //console.log(rnaGraph);
    //console.log(genomes);
    //console.log(replicates);
    //console.log(replicateTemplate)
    // console.log(alignmentFile);
  }

  /**
   * holt die Parameterwerte beim Start der Seite vom Server
   */
  useEffect(() => {
    fetch("/parameters/").then(
      res => res.json())
      .then(
        parameters => {
          setParameters(parameters)
        })
  }, []);


  /**
   * Anpassung des useStates des veränderten Parameter p
   * weitere Parameter die von p abhängig sind werden auch verändert
   */
  const handleParameters = (event) => {
    const name = event.target.name;
    const directParent = event.target.id;
    let val;

    // combobox: value nicht als Nummer speichern
    if (name === "typeofstudy" || name === "clustermethod") {
      val = event.target.value;
    } else {
      val = event.target.valueAsNumber;
    }

    if (directParent === "setup") {
      updateSetupBox(name, 'value', val);
    } else {
      updateParameterBox(directParent, name, 'value', val);
      checkPreset(val, name);
    }

    if (name === "numberofreplicates") {
      setnumRep(val);
      // maximum vom Parameter 'matching replicates' anpassen
      updateParameterBox('Comparative', 'matchingreplicates', 'max', val);

      // Replicate Tabs anpassen
      const repLetter = String.fromCharCode(96 + val);
      const newRep = JSON.parse(repTemplate.replaceAll('0', repLetter));

      if (val > replicateTemplate.length) {
        // Template anpassen
        replicateTemplate.push(newRep);
        setReplicateTemplate(replicateTemplate);

        // Replicates für vorhandene Genome anpassen
        for (var i = 0; i < replicates.length; i++) {
          replicates[i]['genome' + (i + 1)].push(newRep);
        }
        setReplicates(replicates);

      } else if (val < replicateTemplate.length) {
        // Template anpasssen
        replicateTemplate.pop();
        setReplicateTemplate(replicateTemplate);
        // Replicates für vorhandene Genome
        for (var j = 0; j < replicates.length; j++) {
          replicates[j]['genome' + (j + 1)].pop();
        }
        setReplicates(replicates);
      }
    }


    if (name === "numberofgenomes") {
      // Tab hinzugefügt: Genome Objekt hinzufügen
      const genomeName = (parameters.setup.typeofstudy.value).charAt(0).toUpperCase() + (parameters.setup.typeofstudy.value).slice(1) + " " + val;
      if (val > Object.keys(genomes).length) {
        setGenomes(current => (
          [...current,
          {
            ["genome" + val]:
              { name: genomeName, placeholder: genomeName, alignmentid: "", outputid: "", genomefasta: "", genomeannotation: "" }
          }]
        ))
        // Replicates: neues Genom hinzufügen
        replicates.push({ ["genome" + val]: [...replicateTemplate] });
        setReplicates(replicates);

        // Tab entfernt: Genom Objekt entfernen   
      } else if (val < Object.keys(genomes).length) {
        genomes.pop();
        setGenomes(genomes);
        // Replicates: Genom entfernen
        replicates.pop();
        setReplicates(replicates);
      }
    }

    // Genome/Condition Beschriftungen anpassen
    if (name === "typeofstudy") {
      const newName = "Number of " + val.charAt(0).toUpperCase() + val.slice(1) + "s";
      // Number of Genomes/Conditions
      updateSetupBox('numberofgenomes', 'name', newName);

      // Genome/Condition Tabs
      genomes.map((g, i) => (
        g['genome' + (i + 1)].placeholder = val.charAt(0).toUpperCase() + val.slice(1) + " " + (i + 1)
      ))
      setGenomes([...genomes]);

      // allowed cross-genome/condition shift
      updateParameterBox('Comparative', 'allowedcrossgenomeshift', 'name', "allowed cross-" + val + " shift");
    }
  }

  /**
   * update Wert eines Parameters in der parameter box
   */
  const updateParameterBox = (parent, node, element, value) => {
    setParameters(current => (
      {
        ...current,
        parameterBox: {
          ...current.parameterBox,
          [parent]: {
            ...current.parameterBox[parent],
            [node]: { ...current.parameterBox[parent][node], [element]: value }
          }
        }
      }));
  }

  /**
   * update Wert eines Parameters in der setup box
   */
  const updateSetupBox = (node, element, value) => {
    setParameters(current => (
      {
        ...current,
        setup: {
          ...current.setup,
          [node]: { ...current.setup[node], [element]: value }
        }
      }));
  }

  /**
   * überprüft ob ein Parameter preset mit den aktuellen Parameter Werten vorliegt
   */
  const checkPreset = (value, parameterName) => {
    const names = ['stepheight', 'stepheightreduction', 'stepfactor', 'stepfactorreduction', 'enrichmentfactor', 'processingsitefactor'];
    const values = ['default', 'more sensitive', 'more specific', 'very sensitive', 'very specific'];
    const match = [];

    if (!names.includes(parameterName)) { return; }

    values.forEach((val) => {
      const v = val.replace(' ', '')
      // veränderter Parameter übereinstimmung mit voreinstellung?
      if (parameters.parameterBox.Prediction[parameterName][v] === value) {
        match.push(val);
      }
    })

    // restlichen Parameter überprüfen
    if (match.length === 0) {
      setParameterPreset('custom');
    } else {
      names.forEach((name) => {
        if (name !== parameterName) {
          match.forEach((mat) => {
            const v = mat.replace(' ', '');
            if (parameters.parameterBox.Prediction[name][v] !== parameters.parameterBox.Prediction[name].value) {
              match.pop(mat);
            }
          })
        }
      })
    }

    if (match.length !== 0) {
      setParameterPreset(match[0]);
    }
  }

  /**
   * passt Parameter entsprechend des ausgewählten parameter presets an
   */
  const handleParameterPreset = (event) => {
    setParameterPreset(event.target.value);
    const preset = (event.target.value).replace(' ', '');

    if (typeof parameters.parameterBox !== 'undefined' && event.target.value !== 'custom') {
      const names = ['stepheight', 'stepheightreduction', 'stepfactor', 'stepfactorreduction', 'enrichmentfactor', 'processingsitefactor'];
      names.forEach((name) => {
        updateParameterBox('Prediction', name, 'value', parameters.parameterBox.Prediction[name][preset]);
      })
    }
  }

  /**
   * speichert Eingaben in Textfeldern vom Genome Tab ab
   */
  const handleTabs = (event) => {

    const name = event.target.name;
    const value = event.target.value;
    const id = parseInt(event.target.id);

    let temp = [...genomes];
    temp[id]['genome' + (id + 1)][name] = value;
    setGenomes([...temp]);
  }

  /**
   * saves an individual file from genome & replicate tabs
   */
  const saveIndividualFile = (event) => {

    const node = event.target.name;
    const id = event.target.id;
    const file = event.target.files[0];

    // replicate
    if (id.length > 1) {
      saveReplicates(parseInt(id[0]), parseInt(id[2]), node, file);
      // genome
    } else {
      saveGenomes(parseInt(id), node, file);
    }

  }

  /** 
   * saves files that are uploaded over 'upload all files together' button
   */
  const saveFiles = (genomeFiles, enrichFor, enrichRev, normalFor, normalRev, genomeIdx) => {

    saveGenomes(genomeIdx, 'genomefasta', genomeFiles.genomefasta);
    saveGenomes(genomeIdx, 'genomeannotation', genomeFiles.genomeannotation);

    Object.keys(enrichFor).forEach((key) => {
      saveReplicates(genomeIdx, parseInt(key), 'enrichedforward', enrichFor[key]);
    });
    Object.keys(enrichRev).forEach((key) => {
      saveReplicates(genomeIdx, parseInt(key), 'enrichedreverse', enrichRev[key]);
    });
    Object.keys(normalFor).forEach((key) => {
      saveReplicates(genomeIdx, parseInt(key), 'normalforward', normalFor[key]);
    });
    Object.keys(normalRev).forEach((key) => {
      saveReplicates(genomeIdx, parseInt(key), 'normalreverse', normalRev[key]);
    });

  }

  /**
   * saves genome files
   */
  const saveGenomes = (gId, node, file) => {
    const temp = [...genomes];
    temp[gId]['genome' + (gId + 1)][node] = file;
    setGenomes([...temp]);
  }

  /**
   * saves replicate files
   * gId: genome index
   * rId: replicate index
   */
  const saveReplicates = (gId, rId, node, file) => {
    const replicate = 'replicate' + String.fromCharCode(97 + rId);

    let newValue = { ...replicates[gId]['genome' + (gId + 1)][rId][replicate] };
    newValue[node] = file;
    let temp = [...replicates];
    temp[gId]['genome' + (gId + 1)][rId] = { [replicate]: newValue };
    setReplicates([...temp]);
  }


  return (
    <div>

      <header>
        <h1>TSSpredator</h1>
      </header>

      <div className='form-container'>
        <div className='content-box'>
          <label >
            <input className='project-name' type="text" name="project-name" placeholder="Enter Project Name" onChange={(e) => setProjectName(e.target.value)} />
          </label>
          {(typeof parameters.setup === 'undefined') ? (<p></p>) : (<ParameterGroup parameters={parameters.setup} grid={false} onChange={(e) => handleParameters(e)} />)}
        </div>

        <div className='content-box'>
          <h3 className='header'>Upload Data</h3>
          <div className='margin-left'>
            {(typeof parameters.setup === 'undefined')
              ? <></>
              : <>
                <div className={parameters.setup.typeofstudy.value === "genome" ? 'file-box-align' : 'hidden'}>
                  <p className='file-row'>Alignment File</p>
                  <label className='element-row file-row' htmlFor='alignment-file'>
                    <input className='element hidden' type="file" id='alignment-file' onChange={(e) => setAlignmentFile(e.target.files[0])} />
                    <p className='button'>Select File</p>
                    {alignmentFile.length <= 0 ? <p className='file-name'>No file selected.</p> : <p className='file-name'>{alignmentFile.name}</p>}
                  </label>
                </div>

                <Tabs genomes={genomes} genome={true} replicates={replicates} studyType={parameters.setup.typeofstudy.value}
                  handleTabs={(e) => handleTabs(e)} numRep={numRep} saveFiles={(g, ef, er, nf, nr, idx) => saveFiles(g, ef, er, nf, nr, idx)}
                  saveIndividualFile={(e) => saveIndividualFile(e)} />
              </>
            }
          </div>
        </div>

        <div className='content-box'>
          <h3 className='header click-param' onClick={(e) => setShowParam(!showParam)}>+ Parameters</h3>

          <div className={showParam ? 'show margin-left file-column' : 'hidden'}>

            <div className='element-row'>
              <label className='element preset-label' htmlFor='preset'> parameter preset</label>
              <select className='param-preset' value={parameterPreset} name="parameter-preset" id='preset' onChange={(e) => handleParameterPreset(e)}>
                <option value="custom">custom</option>
                <option value="very specific">very specific</option>
                <option value="more specific">more specific</option>
                <option value="default">default</option>
                <option value="more sensitive">more sensitive</option>
                <option value="very sensitive">very sensitive</option>
              </select>

              <input type="checkbox" name="rna-seq-graph" id='check' checked={rnaGraph} onChange={() => setRnaGraph(!rnaGraph)} />
              <label className='element' htmlFor='check'>write rna-seq graph</label>
            </div>

            {(typeof parameters.parameterBox === 'undefined')
              ? (<p></p>)
              : (<ParameterAllGroups parameterGroups={parameters.parameterBox} grid={true} onChange={(e) => handleParameters(e)} />)}
          </div>
        </div>


        <div className='footer'>
          <button className='button load' type="button">Load</button>
          <p>or</p>
          <button className='button save' type="button">Save</button>
          <p>Configuration</p>
          <button className='button run' type="button" onClick={(e) => handleSubmit(e)}>RUN</button>
        </div>

      </div>
    </div>
  )
}

export default App