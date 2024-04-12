import pandas as pd
import os 
import collections
import json
import subprocess
import shutil
from asyncio.subprocess import PIPE


def getHeaderIndices(header):
    return {
        'genome': header.index('Genome') if 'Genome' in header else header.index('Condition'),
        'superPos': header.index('SuperPos'),
        'superStrand': header.index('SuperStrand'),
        'detected': header.index('detected'),
        'enriched': header.index('enriched'),
        'primary': header.index('Primary'),
        'secondary': header.index('Secondary'),
        'internal': header.index('Internal'),
        'antisense': header.index('Antisense')
    }
def getTSSClass(line, headerIndices):
    '''get TSS class from MasterTable'''
    classesIndices = [headerIndices['primary'], headerIndices['secondary'], headerIndices['internal'], headerIndices['antisense']]
    classLine = ",".join([ line[indexUsed] for indexUsed in classesIndices ])
    match classLine:
        case '1,0,0,0':
            return 'Primary'
        case '0,1,0,0':
            return 'Secondary'
        case '0,0,1,0':
            return 'Internal'
        case '0,0,0,1':
            return 'Antisense'
        case _:
            return "Orphan"
        
def getTSSType(line, headerIndices):
    '''get TSS type from MasterTable'''
    tssClass = ",".join([line[indexUsed] for indexUsed in [headerIndices['detected'], headerIndices['enriched']]])
    match tssClass:
        case '1,0':
            return 'Detected'
        case '1,1':
            return 'Enriched'
        case _:
            return "Undetected"
        
def decideMainClass(newClass, oldClass):
    orderTSS = ['Primary', 'Secondary', 'Internal', 'Antisense', 'Orphan']
    if orderTSS.index(newClass) < orderTSS.index(oldClass):
        return newClass
    else:
        return oldClass
    
def readMasterTable(path):
    '''read MasterTable and return as JSON'''
    data_per_genome = {}
    tss_unique = set()
    with open(path, 'r') as f:
        # Parse Header
        header = f.readline().rstrip().split('\t')
        # get indices of relevant columns
        headerIndices = getHeaderIndices(header)
        for line in f:
            line = line.rstrip().split('\t')
            genome = line[headerIndices['genome']]
            if genome not in data_per_genome:
                data_per_genome[genome] = {}
                data_per_genome[genome]['TSS'] = {}
            superPos = line[headerIndices['superPos']]
            superStrand = line[headerIndices['superStrand']]
            tss_unique.add((superPos, superStrand))
            tss_key = f"{superPos}_{superStrand}"

            classesTSS = getTSSClass(line, headerIndices)
            if tss_key not in data_per_genome[genome]["TSS"]:
                typeTSS = getTSSType(line, headerIndices)
                if typeTSS == "Undetected":
                    continue
                data_per_genome[genome]["TSS"][tss_key] = {
                    'superPos': superPos,
                    'superStrand': superStrand,
                    'classesTSS': [classesTSS],
                    "mainClass": classesTSS,
                    'typeTSS': typeTSS, 
                    "count": 1
                }
            else:
                data_per_genome[genome]["TSS"][tss_key]['classesTSS'].append(classesTSS)
                data_per_genome[genome]["TSS"][tss_key]['mainClass'] = decideMainClass(classesTSS, data_per_genome[genome]["TSS"][tss_key]['mainClass'])   
    return data_per_genome, tss_unique

def aggregateTSS(tssList, maxGenome):
    '''aggregate TSS'''
    aggregatedTSS = {}
    binSizes = [5000,10000,50000]
    binSizeMax = {}
    for binSize in binSizes:
        aggregatedTSS[binSize] = []
        maxBinCount = {"+": 0, "-": 0}
        for i in range(0, maxGenome, binSize):
            binStart = i
            binEnd = i + binSize
            filteredTSS = [(tss["mainClass"],tss["superStrand"], tss["typeTSS"]) for tss in tssList if binStart <= int(tss["superPos"]) < binEnd]
            countedTSS = dict(collections.Counter(filteredTSS))
            expanded_countedTSS = []
            binSum = {"+": 0, "-": 0}
            for key in countedTSS.keys():

                binSum[key[1]] += countedTSS[key]
                tempValue = {}
                tempValue['mainClass'] = key[0]
                tempValue['strand'] = key[1]
                tempValue['typeTSS'] = key[2]
                tempValue['count'] = countedTSS[key]
                
                tempValue['binStart'] = binStart

                tempValue['binEnd'] = min(binEnd, maxGenome)
                expanded_countedTSS.append(tempValue)
            maxBinCount = {"+": max(maxBinCount["+"], binSum["+"]), "-": max(maxBinCount["-"], binSum["-"])}
            aggregatedTSS[binSize].extend(expanded_countedTSS)
        binSizeMax[binSize] = maxBinCount
       
    return aggregatedTSS, binSizeMax


def adaptWiggleFile(inputDir, genome, strand, resultsDir):
    '''adapt wiggle file and return path'''
    results_per_filetype = {}
    ## TODO: from file to df
    file_names = {}
    for fileType in ["superFivePrime", "superNormal"]:
        file, df, maxEnd, min_val, max_val = from_bedgraph_to_df(inputDir, genome, fileType, strand)
        # results_per_filetype[fileType] = {"file": file, "df": df, "maxEnd": maxEnd, "min": min_val, "max": max_val}
   ## TODO: Normalize both files using the max and min from both files
    # min_value = min(results_per_filetype[fileType]["min"] for fileType in results_per_filetype)
    # max_value = max(results_per_filetype[fileType]["max"] for fileType in results_per_filetype)
    # for fileType in ["superFivePrime", "superNormal"]:
        # df = results_per_filetype[fileType]["df"]
        # df['value'] = (df['value'] - min_value) / (max_value - min_value)
        # results_per_filetype[fileType]["df"] = df
        # file = results_per_filetype[fileType]["file"]
        # maxEnd = results_per_filetype[fileType]["maxEnd"]
        outputBigWig = from_bedgraph_to_bw(inputDir, genome, fileType, strand, resultsDir, file, df, maxEnd)
        file_names[fileType] = outputBigWig
    return {"filename":file_names}

def from_bedgraph_to_bw(inputDir, genome, fileType, strand, resultsDir, file, df, maxEnd):
    df["chrom"] = genome
    chromSizes = os.path.join(inputDir, f'{genome}.chromsizes')
    with open(chromSizes, 'w') as f:
        f.write(f'{genome}\t{maxEnd+1}\n')
    df = df[['chrom', 'start', 'end', 'value']]

    adaptedFile = file.replace("_avg.bigwig", "_adapted.bigwig")
    df.to_csv(adaptedFile, sep='\t', index=False, header=False)
    outputBigWig = os.path.join(resultsDir, f'{genome}_{fileType}{strand}.bw')
    serverLocation = os.getenv('TSSPREDATOR_SERVER_LOCATION', os.path.join(os.getcwd(), "server_tsspredator"))
    bedGraphPath = os.path.join(serverLocation, 'bedGraphToBigWig')
    result = subprocess.run([bedGraphPath, adaptedFile, chromSizes, outputBigWig], stdout=subprocess.PIPE, 
                                stderr=subprocess.PIPE, 
                                text=True)
    if len(result.stderr) > 0:
        print(f'Error {result.stderr}')
    return outputBigWig

def from_bedgraph_to_df(inputDir, genome, fileType, strand):
    file = os.path.join(inputDir, f'{genome}_{fileType}{strand}_avg.bigwig')
    df = pd.read_csv(file, sep='\t')
    df["end"] = df["end"] + 1
    maxEnd = df['end'].max()
    if strand == "Minus":
        df['value'] = df['value'] * -1
        # if negative change to zero
        df['value'] = df['value'].apply(lambda x: 0 if x < 0 else x)
    # get mix max of value
    min, max = df['value'].min(), df['value'].max()
    return file,df,maxEnd,min,max
def parseRNAGraphs(tmpdir, genomeKey, resultsDir):
    '''parse RNA graphs and return path as json. Only send path, not the whole file.'''
    # get only last part of tmpdir
    lastPart = tmpdir.split('/')[-1]
    dataRNA = {}
    for strand in ['Plus', 'Minus']:
        dataRNA[strand] = {}
        bw_name = adaptWiggleFile(tmpdir, genomeKey, strand, resultsDir)
        for fileType in ["superFivePrime", "superNormal"]:
            dataRNA[fileType] = {
            'path': lastPart, 
            'filename': bw_name["filename"][fileType],
            # 'normalization': bw_name["normalization"]
        }

    return dataRNA


def descriptionToObject(description):
    '''convert description to object'''
    data = {}
    for entry in description:
        entry = entry.split('=')
        data[entry[0]] = entry[1]
    return data


def parseSuperGFF (path):
    '''parse SuperGFF and return as JSON'''
    data_per_gene = []
    maxValue = 0
    with open(path, 'r') as f:
        for line in f:
            if line.startswith('#'):
                continue
            line = line.rstrip().split('\t')
            description = descriptionToObject(line[8].split(';'))
            data_per_gene.append({
                "start": line[3],
                "end": line[4],
                "strand": line[6],
                "locus_tag": description.get('locus_tag', ''),
                "gene_name": description.get('gene_name', ''),
                "product": description.get('product', ''),
            })
            maxValue = max(maxValue, int(line[4]))
            
    return data_per_gene, maxValue

def from_fasta_to_tsv(tempDir, genomeKey, resultsDir, unique_tss):
    '''convert fasta to tsv'''
    with open(os.path.join(tempDir, f'{genomeKey}_super.fa'), 'r') as f:
        genome_as_string = ""
        for line in f:
            if line.startswith('>'):
                continue
            line = line.rstrip()
            genome_as_string += line

    length_genome = len(genome_as_string)
    for fix_strand in ["+", "-"]:
        filt_unique_tss = [tss[0] for tss in unique_tss if tss[1] == fix_strand]
        with open(os.path.join(resultsDir,f'{genomeKey}_{fix_strand}_superGenome.tsv'), 'w') as output:
            for pos in filt_unique_tss:
                if pos < 1 or pos > length_genome:
                    continue
                base = genome_as_string[pos-1]
                if fix_strand == "-":
                    base = reverse_base(base)
                output.write(f'{pos}\t{base}\n')
       

def reverse_base(base):
    '''reverse base'''
    match base:
        case 'A':
            return 'T'
        case 'T':
            return 'A'
        case 'C':
            return 'G'
        case 'G':
            return 'C'
        case _:
            return base
def expandTSSPositions(tss_set, expansion):
    '''expand TSS positions'''
    expandedTSS = set()
    for tss_pair in tss_set:
        tss = int(tss_pair[0])
        strand = tss_pair[1]
        rangeIteration = range(-expansion, 1) if strand == "+" else range(expansion, -1, -1)
        for i in rangeIteration:
            expandedTSS.add((int(tss + i),strand))
    return expandedTSS  

    
def process_results(tempDir, resultsDir): 
    masterTablePath = tempDir + '/MasterTable.tsv'
    # copy config file to resultsDir
    configPath = tempDir + '/config.json'
    shutil.copy(configPath, resultsDir + '/config.json')
    masterTable, unique_tss = readMasterTable(masterTablePath)
    unique_tss_expanded = expandTSSPositions(unique_tss, 50)
    rnaData = {}
    for genomeKey in masterTable.keys():
        masterTable[genomeKey]['TSS'] = list(masterTable[genomeKey]['TSS'].values())
        # get path of SuperGFF
        superGFFPath = tempDir + '/' + genomeKey + '_super.gff'
        # read SuperGFF
        masterTable[genomeKey]["superGFF"], maxValue = parseSuperGFF(superGFFPath)
        # masterTable[genomeKey]['super'] = maxValue
        masterTable[genomeKey]['lengthGenome'] = maxValue
        masterTable[genomeKey]['aggregatedTSS'], maxValueTSS = aggregateTSS(masterTable[genomeKey]['TSS'], maxValue)
        masterTable[genomeKey]['maxAggregatedTSS'] = maxValueTSS
        rnaData[genomeKey] = {}
        rnaData[genomeKey] = parseRNAGraphs(tempDir, genomeKey, resultsDir)
        from_fasta_to_tsv(tempDir, genomeKey, resultsDir, unique_tss_expanded)
    #write compressed json in resultsDir
    with open(resultsDir + '/aggregated_data.json', 'w') as f:
        f.write(json.dumps(masterTable))
        
    return 