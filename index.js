const fs = require('fs')

const inputDir = '/home/local/download_30-11_0-500_filtered/'
// const inputDir = './input/'

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

  const grouped = Object.keys(uniqueSiteKeyPairs)
    .reduce((grouped, i) => {
      const { key, site } = uniqueSiteKeyPairs[i]
      grouped[key] = (grouped[key] || []).concat(site)
      return grouped
    }, {})
  console.log(`Unique miner keys: ${Object.keys(grouped).length}`)

  fs.writeFileSync('./sites-by-key.json', JSON.stringify(grouped, null, 2))

  const keyCounts = Object.keys(grouped)
    .reduce((keyCounts, key) => {
      keyCounts[key] = grouped[key].length
      return keyCounts
    }, {})

  fs.writeFileSync('./key-counts.json', JSON.stringify(keyCounts, null, 2))

  const dataForR = Object.keys(keyCounts)
    .reduce((output, key, index) => 
      output.concat({x: key, y: keyCounts[key]})
    , [])

  fs.writeFileSync('./data-for-r.json', JSON.stringify(dataForR, null, 2))
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