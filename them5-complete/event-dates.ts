const months=['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const short=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const dayMs=86400000,offset=7*3600000;
function stamp(year:number,month:number,day:number){year=year>2400?year-543:year;const d=new Date(Date.UTC(year,month-1,day));return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?d.getTime()-offset:NaN;}
export function eventRange(event:any):{start:number;end:number}|null{
  let start=NaN,end=NaN;
  if(event.startDate){
    const parse=(s:string)=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);return m?stamp(+m[1],+m[2],+m[3]):NaN;};
    start=parse(event.startDate);end=parse(event.endDate||event.startDate);
  }else{
    let text=String(event.date||'').replace(/[๐-๙]/g,c=>String('๐๑๒๓๔๕๖๗๘๙'.indexOf(c))).replace(/[–—]/g,'-');
    short.forEach((s,i)=>{text=text.split(s).join(months[i]);});
    const iso=text.match(/\d{4}-\d{2}-\d{2}/g);
    if(iso?.length){const nums=iso.map(s=>s.split('-').map(Number));start=stamp(nums[0][0],nums[0][1],nums[0][2]);const n=nums[nums.length-1];end=stamp(n[0],n[1],n[2]);}
    else{
      const monthPattern=months.join('|');
      const cross=new RegExp(`(\\d{1,2})\\s*(${monthPattern})\\s*(\\d{4})?\\s*-\\s*(\\d{1,2})\\s*(${monthPattern})\\s*(\\d{4})`).exec(text);
      if(cross){const endYear=+cross[6],startYear=cross[3]?+cross[3]:endYear-(months.indexOf(cross[2])>months.indexOf(cross[5])?1:0);start=stamp(startYear,months.indexOf(cross[2])+1,+cross[1]);end=stamp(endYear,months.indexOf(cross[5])+1,+cross[4]);}
      else{const m=new RegExp(`(\\d{1,2})(?:\\s*-\\s*(\\d{1,2}))?\\s*(${monthPattern})\\s*(\\d{4})`).exec(text);if(m){start=stamp(+m[4],months.indexOf(m[3])+1,+m[1]);end=stamp(+m[4],months.indexOf(m[3])+1,+(m[2]||m[1]));}}
    }
  }
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)return null;
  const time=String(event.time||'').match(/\b\d{1,2}[:.]\d{2}\b/g)||[];
  const minutes=(s:string)=>{const [h,m]=s.split(/[:.]/).map(Number);return h<24&&m<60?(h*60+m)*60000:NaN;};
  if(time.length>=2&&Number.isFinite(minutes(time[0]))&&Number.isFinite(minutes(time[time.length-1]))){start+=minutes(time[0]);end+=minutes(time[time.length-1]);}
  else end+=dayMs-1;
  return end>=start?{start,end}:null;
}
export function thaiWeek(now=new Date()){
  const thai=new Date(now.getTime()+offset);const midnight=Date.UTC(thai.getUTCFullYear(),thai.getUTCMonth(),thai.getUTCDate())-offset;
  const start=midnight-((thai.getUTCDay()+6)%7)*dayMs;return{start,end:start+7*dayMs-1};
}
export function currentWeekEvents(events:any[],now=new Date()):any[]{
  const week=thaiWeek(now),ms=now.getTime();
  return events.map(event=>({event,range:eventRange(event)})).filter(x=>x.event.active!==false&&x.range&&x.range.end>=ms&&x.range.start<=week.end&&x.range.end>=week.start).sort((a,b)=>a.range!.start-b.range!.start).map(x=>x.event);
}
