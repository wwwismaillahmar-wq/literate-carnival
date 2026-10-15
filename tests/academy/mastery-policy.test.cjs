const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const Module = require('node:module');

const file = path.join(__dirname,'../../src/lib/academy/mastery-policy.ts');
const source = fs.readFileSync(file,'utf8');
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded = new Module(file,module);
loaded.filename=file; loaded.paths=module.paths; loaded._compile(js,file);
const {evaluateMastery} = loaded.exports;
const evidence = {
 assessmentScores:{exam:86},approvedActivities:['project'],
 passedSafetyCompetencies:['electrical'],masteredUnits:['intro'],now:'2026-10-14T12:00:00Z'
};
const condition = (kind,fields) => ({operator:'condition',condition:{kind,...fields}});
test('all conditions require verified evidence',()=>{
 const rule={operator:'all',rules:[
  condition('assessment',{assessmentId:'exam',minimumScore:85}),
  condition('practical',{activityId:'project',requiredStatus:'approved'}),
  condition('safety',{competencyId:'electrical'}),
  condition('prerequisite',{unitId:'intro'}),
  condition('release_after',{isoDate:'2026-10-14T11:00:00Z'})
 ]};
 assert.equal(evaluateMastery(rule,evidence).allowed,true);
 assert.equal(evaluateMastery(rule,{...evidence,approvedActivities:[]}).allowed,false);
});
test('any rule succeeds with one verified path',()=>{
 const rule={operator:'any',rules:[condition('assessment',{assessmentId:'missing',minimumScore:90}),condition('safety',{competencyId:'electrical'})]};
 assert.equal(evaluateMastery(rule,evidence).allowed,true);
});
test('invalid and empty policies fail closed',()=>{
 assert.equal(evaluateMastery({operator:'all',rules:[]},evidence).allowed,false);
 assert.equal(evaluateMastery(condition('assessment',{assessmentId:'exam',minimumScore:101}),evidence).allowed,false);
 assert.equal(evaluateMastery(condition('release_after',{isoDate:'invalid'}),evidence).allowed,false);
});
test('future releases are unavailable',()=>{
 assert.equal(evaluateMastery(condition('release_after',{isoDate:'2026-10-15T12:00:00Z'}),evidence).allowed,false);
});
test('recursive policies exceeding maximum depth fail closed',()=>{
 let rule=condition('safety',{competencyId:'electrical'});
 for(let i=0;i<15;i++) rule={operator:'all',rules:[rule]};
 assert.equal(evaluateMastery(rule,evidence).allowed,false);
});
