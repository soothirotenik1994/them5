const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const t1 = `
          {/* AMENITIES & FACILITIES */}
          <div id="amenities" className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
`;
const r1 = `
          {/* AMENITIES & FACILITIES */}
          <motion.div 
            id="amenities" 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5"
          >
`;

const t2 = `
          {/* PROMOTIONS LISTING */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
`;
const r2 = `
          {/* PROMOTIONS LISTING */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5"
          >
`;

const t3 = `
          {/* IMPACT EVENTS FEED */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-4">
`;
const r3 = `
          {/* IMPACT EVENTS FEED */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-4"
          >
`;

const t4 = `
          {/* GUEST REVIEWS & TESTIMONIALS (ความประทับใจและความคิดเห็นรับรองจริง) */}
          <div className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
`;
const r4 = `
          {/* GUEST REVIEWS & TESTIMONIALS (ความประทับใจและความคิดเห็นรับรองจริง) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5"
          >
`;

const t5 = `
          {/* FAQ & LOCATION AREA */}
          <div id="location" className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5">
`;
const r5 = `
          {/* FAQ & LOCATION AREA */}
          <motion.div 
            id="location" 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6 }}
            className="p-6 sm:p-8 lg:p-6 xl:p-8 border-b border-neutral-900 space-y-5"
          >
`;

code = code.replace(t1.trim(), r1.trim());
code = code.replace(t2.trim(), r2.trim());
code = code.replace(t3.trim(), r3.trim());
code = code.replace(t4.trim(), r4.trim());
code = code.replace(t5.trim(), r5.trim());
fs.writeFileSync('src/App.tsx', code);
