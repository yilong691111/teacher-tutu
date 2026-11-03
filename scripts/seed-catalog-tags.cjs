/* One-time seed from explicit existing descriptions; owners can edit every tag. */
const fs=require('node:fs'),path=require('node:path'),taxonomy=require('../taxonomy.js');
const root=path.join(__dirname,'..'),site=JSON.parse(fs.readFileSync(path.join(root,'data/site.json'),'utf8'));
const holidays=[['世界善良日',/世界善良日/],['世界兒童節',/世界兒童節/],['萬聖節',/萬聖/],['生日',/生日/],['農曆新年',/農曆新年|羊年|賀歲|春節/],['跨年',/跨年/],['感恩節',/感恩節/],['光復節',/光復節/],['聖誕節',/聖誕節/]];
const situations=[['感謝',/感謝|謝謝/],['問候',/早安|午安|晚安|問候/],['祝福',/祝福|生日|新年|聖誕|賀歲/],['上課',/上課|校園|班導師|英文課/],['考試',/考試/],['加班',/加班/],['學習',/成語|單字|英文/],['天氣',/颱風|下雨/]];
for(const key of ['lineProducts','gallery','festivals'])for(const item of site[key]||[]){
 if(item.catalogTags)continue;
 const text=[item.title,item.subtitle,item.holidayName,item.series,item.description].filter(Boolean).join(' '),characters=(site.characters||[]).filter(c=>text.includes(c.name)).map(c=>c.name);
 if(!characters.length&&text.includes('塗塗'))characters.push('塗塗');
 item.catalogTags={topic:taxonomy.topicFor(item),characters,holidays:holidays.filter(([,re])=>re.test(text)).map(([name])=>name),situations:situations.filter(([,re])=>re.test(text)).map(([name])=>name)};
}
taxonomy.validate(site);const text=JSON.stringify(site,null,2);fs.writeFileSync(path.join(root,'data/site.json'),text+'\n');fs.writeFileSync(path.join(root,'data/site-data.js'),'window.TUTU_BOOTSTRAP = '+text.replace(/</g,'\\u003c')+';\n');
console.log('Shared tags saved for existing sticker, gallery and festival records.');
