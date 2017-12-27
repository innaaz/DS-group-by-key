const fs = require('fs')

// const inputDir = '/home/local/download_30-11_0-500_filtered/'
const inputDir = './input/'

const fileNames = fs.readdirSync(inputDir)
console.log(`Number of files: ${fileNames.length}`)

// Promises are to parallelise reading files
readFiles(fileNames).then(siteKeyPairs => {
  const nonFalsySiteKeyPairs = siteKeyPairs.filter(p => p)
  console.log(`Number of site versions with miners: ${nonFalsySiteKeyPairs.length}`)
  
  const uniqueSiteKeyPairs = nonFalsySiteKeyPairs
    .reduce((uniq, { site, key }) => {
      uniq[site + key] = { site, key }
      return uniq
    }, {})

  const keyCounts = Object.keys(uniqueSiteKeyPairs)
    .reduce((keyCounts, i) => {
      const { key } = uniqueSiteKeyPairs[i]
      keyCounts[key] = (keyCounts[key] || 0) + 1
      return keyCounts
    }, {})
  // keyCounts is:
  // {
  //   'Expecting': 500,
  //   '234AOT753GD': 5,
  //   '7825DFS5FDH': 3
  //   ...
  // }
  // where number is how many sites use the key

  const keyCountsKeys = Object.keys(keyCounts)
  console.log(`Unique miner keys: ${keyCountsKeys.length}`)
  const output = keyCountsKeys
    .reduce((output, key, index) => {
      progress('output', index, keyCountsKeys.length)
      return output.concat({x: key, y: keyCounts[key]})
    }, [])
  // output is how R expects it:
  // [
  //   {x: 'Expecting', y: 500},
  //   {x: '234AOT753GD', y: 5},
  //   {x: '7825DFS5FDH', y: 3}
  // ]

  const outputContent = JSON.stringify(output, null, 2)
  console.log(`\n${outputContent}\n`)
  fs.writeFileSync('./data-for-r.json', outputContent)
})

function readFiles(fileNames) {
  return Promise.all(
    fileNames
      .map((fileName, index) =>
        new Promise((resolve, error) => {
          progress('Requesting readFile', index, fileNames.length)
          fs.readFile(inputDir + fileName, (err, data) => {
            if (err) { return error(err) }
            resolve(data)
          })
        }).then(content => {
          progress('Extracting key', index, fileNames.length)
          content = content.toString()
          if (content.indexOf('"miner": {}') !== -1) { 
            return false 
          }
          const [_, key] = content.match(/^\s+"key"\: "(.+)",$/m) || [0, false]
          if (!key) { return false }
          const noOUT = fileName.substr(4)
          const site = noOUT.substr(0, noOUT.indexOf('_'))
          return { site, key }
        }).catch(error => {
          console.error(error)
          return false
        })
      )
  )
}

function progress (what, index, total) {
  if (index % (Math.round(total / 10)) === 0) {
    console.log(`${what}: ${Math.round(index / total * 100)}%`)
  }
}