var fs          = require('fs')
var cheerio     = require('cheerio')
var Promise     = require('bluebird')
var rp          = require('request-promise')
var theurl      = 'https://www.bankmega.com/promolainnya.php'
var promo       = {}
var kategori    = []
var {PerformanceObserver, performance } = require('perf_hooks')

Promise.promisifyAll(require("request"))
var waktu       = performance.now()

function bytes(size) {
    var satuan = ['Bytes', 'KB', 'MB']
    if (size == 0){
        return '0 Byte'
    }else{
        var i = parseInt(Math.floor(Math.log(size) / Math.log(1024)))
        return Math.round(size / Math.pow(1024, i), 2) + ' ' + satuan[i]
    }
 };

const dataPromo = async (subcat = 1, page = 1) => {
    url = theurl+'?subcat='+subcat+'&page='+page;
    console.clear();
    console.log('\n Scraping Kategori '+subcat+' Page '+page+'')
    console.log(" - Terunduh di detik "+Math.floor((performance.now()-waktu)/1000))

    const options = {
        uri: url,
        transform: function (body){
            return cheerio.load(body)
        }
    };


    try {
        const $      = await rp(options)
        const jmlCat = $('#subcatpromo').find('img').length;

        if (subcat === 1 && page === 1) {
            $('#subcatpromo').find('img').each((idxPromo, img) =>{
                kategori.push(img.attribs.id)
                promo[img.attribs.id] = [];
            });
        }

        const imgPromo  = $('#imgClass');
        if (imgPromo.length > 0) {
            const arrDetail = []
            imgPromo.each((i, img) => {
                let dataDetail = {
                    uri:        'https://www.bankmega.com/'+img.parent.attribs.href,
                    transform:  function(body){
                        return cheerio.load(body)
                    }
                }
                arrDetail.push(rp(dataDetail))
            })


            await Promise.all(arrDetail)
                .then(details => {
                    details.map(detail => {
                        const title     = detail(".titleinside h3").text();
                        const imageurl    = detail(".keteranganinside img").attr("src")
                        const area      = detail(".area b").text()
                        const periode   = detail(".periode b").eq(0).text()+detail(".periode b").eq(1).text();
                        
                        promo[kategori[subcat-1]].push({
                            title,
                            imageurl,
                            area,
                            periode
                        })
                    })
                })
                .catch(errdet =>{ console.log(errdet) })
                page++
                return dataPromo(subcat, page)
        }else if (subcat < jmlCat) {
            subcat++
            return dataPromo(subcat, 1)
        }else{
            console.log(promo)
            const dataSaved = JSON.stringify(promo, null, 2)
            fs.writeFile("solution.json", dataSaved,'utf-8', () =>{
                console.log("Data Diunduh ke solution.json ");
                console.log("Ukuran Data : "+bytes(JSON.stringify(promo).length));
                console.log("Waktu Proses : "+Math.floor((performance.now()-waktu)/1000)+" detik");
            })
        }
    }
    catch (error){
        return error
    }
}
dataPromo()
    .then(promos => {
        console.log("\n=== SCRAPING DONE ===\n")
    })
    .catch(err => {
        console.log(err)
    })