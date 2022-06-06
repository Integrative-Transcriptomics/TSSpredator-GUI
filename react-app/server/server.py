from asyncio.subprocess import PIPE
from ctypes import alignment
from distutils.archive_util import make_archive
from flask import Flask, request, send_file
from werkzeug.utils import secure_filename
import parameter
import sys
import json
import tempfile
import subprocess
import os
import shutil

import server_handle_files as sf


app = Flask(__name__)

@app.route('/parameters/')
def parameters():
    return  parameter.getParameters()

@app.route('/result/')
def getFiles():
    return  send_file('./result.zip', mimetype='application/zip') 


@app.route('/input/', methods=['POST', 'GET'])
def getInput():

    # get all input information
    genomeFasta = request.files.to_dict(flat=False)['genomefasta']

   # multiple genomannotation files per genome possible
    genomeAnnotation = []
    try:
        for x in range(len(genomeFasta)):
            genomeAnnotation.append(request.files.to_dict(flat=False)['genomeannotation'+str(x+1)])
    except:
        print("No genome Annotation file.")    
  
    enrichedForward  = request.files.to_dict(flat=False)['enrichedforward']
    enrichedReverse = request.files.to_dict(flat=False)['enrichedreverse']
    normalForward = request.files.to_dict(flat=False)['normalforward']
    normalReverse = request.files.to_dict(flat=False)['normalreverse']    

    projectName = request.form['projectname']
    parameters = json.loads(request.form['parameters'])
    rnaGraph = request.form['rnagraph']
    genomes = json.loads(request.form['genomes'])
    replicates = json.loads(request.form['replicates'])
    replicateNum = json.loads(request.form['replicateNum'])


    # create temporary directory, save files and save filename in genome/replicate object
    with tempfile.TemporaryDirectory() as tmpdir: 

        newTmpDir = tmpdir.replace('\\', '/')

        with tempfile.TemporaryDirectory() as annotationDir:

            newAnnotationDir = annotationDir.replace('\\', '/')
 
            genomes, replicates = sf.save_files(newTmpDir, newAnnotationDir, genomes, replicates, genomeFasta, genomeAnnotation, enrichedForward, enrichedReverse, normalForward, normalReverse, replicateNum)
            
            # if alingment file is given -> study type = align
            alignmentFilename = ''
            try:
                alignmentFile = request.files['alignmentfile']
                # save alignment file
                alignmentFilename = newTmpDir + '/' + secure_filename(alignmentFile.filename)
                alignmentFile.save(alignmentFilename)   
            except:
                print('No alignment file')
           

            with tempfile.TemporaryDirectory() as resultDir:

                newResultDir = resultDir.replace('\\', '/')

                # create json string for jar
                jsonString = sf.create_json_for_jar(genomes, replicates, replicateNum, alignmentFilename, projectName, parameters, rnaGraph, newResultDir)

                # call jar file for TSS prediction
                p = subprocess.run(['java', '-jar', 'TSSpredator.jar', jsonString], stderr=PIPE)

                # zip files
                if os.path.exists("result.zip"):
                    os.remove("result.zip")
                make_archive('result', 'zip', newResultDir)

                # return 'success' or 'error'
                if(len(p.stderr) == 0):
                    return {'result': 'success'}
                else: 
                    return {'result': (p.stderr).decode()}
        
        
 

# read alignment file when it was generated by mauve and send genome names and ids back
@app.route('/alignment/', methods=['POST', 'GET'])
def getAlignment():

    alignmentFile = request.files['alignmentFile']

    with tempfile.TemporaryDirectory() as tmpdir:

        newTmpDir = tmpdir.replace('\\', '/')

        # save alignment file
        alignmentFilename = newTmpDir + '/' + secure_filename(alignmentFile.filename)
        alignmentFile.save(alignmentFilename)

        # write JSON string 
        jsonString = '{'
        jsonString += '"loadConfig": "false",' + '"saveConfig": "false", "loadAlignment": "true",' + '"alignmentFile": "' + alignmentFilename + '"}'

        # call jar file for to extract genome names & ids
        result = subprocess.run(['java', '-jar', 'TSSpredator.jar', jsonString], stdout=PIPE, stderr=PIPE)
        
        if(len(result.stderr) == 0):
            return {'result': json.loads((result.stdout).decode())}
        else:
            return {'result': json.loads((result.stderr).decode())}
        


# loads a config file
@app.route('/loadConfig/', methods=['POST', 'GET'])
def loadConfig():

    configFile = request.files['configFile']
    parameters = json.loads(request.form['parameters'])
    genomes = json.loads(request.form['genomes'])
    replicates = json.loads(request.form['replicates'])

    with tempfile.TemporaryDirectory() as tmpdir:

        newTmpDir = tmpdir.replace('\\', '/')

        # save alignment file
        configFilename = newTmpDir + '/' + secure_filename(configFile.filename)
        configFile.save(configFilename)

        # write JSON string 
        jsonString = '{'
        jsonString += '"loadConfig": "true",' + '"saveConfig": "false", "loadAlignment": "false",' + '"configFile": "' + configFilename + '"}'
        
        # call jar file for to extract genome names & ids
        result = subprocess.run(['java', '-jar', 'TSSpredator.jar', jsonString], stdout=PIPE, stderr=PIPE)
        
      
        if(len(result.stderr) == 0):
            config = json.loads((result.stdout).decode())
            parameters, genomes, replicates, alignmentFile = sf.handle_config_file(parameters, config, genomes, replicates)

            projectName = sf.get_value(config, 'projectName')

            rnaGraph = 'false'
            if int(sf.get_value(config, 'writeGraphs')) == 1:
                rnaGraph = "true"

            # use json.dumps() to keep order            
            return {'result': {'parameters': json.dumps(parameters), 'genomes': json.dumps(genomes), 
                    'replicates': json.dumps(replicates), 'projectName': projectName, 'rnaGraph': rnaGraph, 'alignmentFile': alignmentFile, 
                    'numReplicate': parameters['setup']['numberofreplicates']['value']}}
        else:
            return {'result': json.loads((result.stderr).decode())}
     


# saves input as config file
@app.route('/saveConfig/', methods=['POST', 'GET'])
def saveConfig():

    # get all inputs
    # get absolute paths for the files
    # send to jar



    


       
            


        

        
            

            

       

   # filename = secure_filename(genomeFasta.filename)
   # print(genomeFasta, file=sys.stdout)
   # print(genomeAnnotation, file=sys.stdout)
   # print(enrichedForward, file=sys.stdout)
   # print(enrichedReverse, file=sys.stdout)
   # print(normalForward, file=sys.stdout)
   # print(normalReverse, file=sys.stdout)

    # return result of tss prediction
    return {'ah': 'b'}    



if __name__ == "__main__":
    app.run(debug=True)