import {test} from 'node:test';
import assert from 'node:assert/strict';
import {currentWeekEvents,eventRange,thaiWeek} from '../event-dates.ts';
test('current Thai week hides expired, future-week, inactive and unknown events',()=>{
  const now=new Date('2026-09-23T08:00:00Z');
  const events=[{id:'old',date:'16-18 กันยายน 2569'},{id:'current',date:'23-27 กันยายน 2569'},{id:'next',date:'28-30 กันยายน 2569'},{id:'unknown',date:'เร็วๆ นี้'},{id:'off',date:'23 กันยายน 2569',active:false},{id:'finished',date:'23 กันยายน 2569',time:'10:00-14:00'},{id:'ongoing',date:'23 กันยายน 2569',time:'10:00-18:00'}];
  assert.deepEqual(currentWeekEvents(events,now).map(e=>e.id),['current','ongoing']);
  assert.equal(new Date(thaiWeek(now).start).toISOString(),'2026-09-20T17:00:00.000Z');
  assert.equal(eventRange({date:'30 กรกฎาคม - 02 สิงหาคม 2569'})?.end,new Date('2026-08-02T23:59:59.999+07:00').getTime());
  assert.equal(eventRange({date:'31 ธันวาคม - 02 มกราคม 2570'})?.start,new Date('2026-12-31T00:00:00+07:00').getTime());
  assert.equal(eventRange({date:'31 กุมภาพันธ์ 2569'}),null);
  assert.equal(currentWeekEvents([{date:'28 ก.ย. 2569'}],new Date('2026-09-27T17:00:00Z')).length,1);
});
