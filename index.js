const fs = require('fs')

const inputDir = '/home/local/download_30-11_0-500_filtered/'
// const inputDir = './input/'

const fileNames = fs.readdirSync(inputDir)
console.log(`Number of files: ${fileNames.length}`)
const siteToFileNameMap = fileNames
  .sort()
  .reduce((siteToFileNameMap, fileName, index) => {
    progress('siteToFileNameMap', index, fileNames.length)
    const noOUT = fileName.substr(4)
    const site = noOUT.substr(0, noOUT.indexOf('_'))
    siteToFileNameMap[site] = fileName
    return siteToFileNameMap
  }, {})
// at this point siteToFileNameMap is:
// { 
//   'zztop.com': 'OUT_zztop.com_20171104.json',
//   'zzu.edu.cn': 'OUT_zzu.edu.cn_20170911.json',
//   'zzuli.edu.cn': 'OUT_zzuli.edu.cn_20170922.json',
//   ...
// }
// where the json file is the one with the most recent date

const sites = Object.keys(siteToFileNameMap)
console.log(`Number of sites: ${sites.length}`)
// Promises are to parallelise reading files
Promise.all(
  sites
    .map((site, index) =>
      new Promise((resolve, error) => {
        progress('Requesting readFile', index, sites.length)
        const fileName = siteToFileNameMap[site]
        fs.readFile(inputDir + fileName, (err, data) => {
          if (err) { return error(err) }
          resolve(data)
        })
      }).then(content => {
        progress('Extracting key', index, sites.length)
        content = content.toString()
        if (content.indexOf('"miner": {}') !== -1) { 
          return false 
        }
        const [_, key] = content.match(/^\s+"key"\: "(.+)",$/m) || [0, 0]
        return key
      }).catch(error => {
        console.error(error)
        return false
      })
    )
).then(keys => {
  const nonFalsyKeys = keys.filter(key => key)
  console.log(`Number of sites with miners: ${nonFalsyKeys.length}`)
  
  const keyCounts = nonFalsyKeys
    .reduce((keyCounts, key) => {
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


function progress (what, index, total) {
  if (index % (Math.round(total / 10)) === 0) {
    console.log(`${what}: ${Math.round(index / total * 100)}%`)
  }
}