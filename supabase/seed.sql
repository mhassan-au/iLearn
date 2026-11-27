-- Local-only demonstration content with fictional organisations and evidence.
insert into public.topics (id, slug, title, description, objectives, estimated_minutes, sort_order, status)
values ('cyber-assurance','cyber-assurance','Cybersecurity Assessment, Risk and Assurance',
  'Learn to identify security risks, evaluate evidence and recommend proportionate controls.',
  array['Explain the CIA triad','Document risks using fictional evidence'],75,1,'published');

insert into public.modules (id, topic_id, slug, title, description, objectives, estimated_minutes, sort_order, status)
values ('foundations','cyber-assurance','foundations','Cybersecurity and Assessment Foundations',
  'Use core security concepts to assess a small organisation.',array['Recognise common security risks'],75,1,'published');

insert into public.chapters (id, module_id, slug, title, description, objectives, estimated_minutes, sort_order, status)
values ('cia-triad','foundations','cia-triad','Cybersecurity Principles and the CIA Triad',
  'Classify risks and choose practical controls.',array['Distinguish confidentiality, integrity and availability'],75,1,'published');

insert into public.activities (id, chapter_id, title, type, description, content, estimated_minutes, sort_order, status)
values
('intro','cia-triad','Introduction to cybersecurity','lesson','Connect assets, threats and controls.',
  '{"objectives":["Distinguish assets, threats and controls"],"markdown":"A customer contact list is an **asset**. Accidental disclosure is a **threat event**. Restricting access to staff who need the list is a **control**. Record what could happen, what it would affect, and which evidence supports your judgment.","takeaways":["Describe the asset and consequence before choosing a control."]}',8,1,'published'),
('fundamentals','cia-triad','Cybersecurity fundamentals','shortQuiz','Identify an example of a control.','{}',4,2,'published'),
('cia','cia-triad','Confidentiality, integrity and availability','lesson','Classify security impacts.',
  '{"objectives":["Classify consequences using the CIA triad"],"markdown":"**Confidentiality** limits disclosure. **Integrity** protects accuracy and completeness. **Availability** keeps information and services usable when needed. If a fictional bakery cannot retrieve its order list during service, the primary impact is availability.","takeaways":["A single event can affect multiple CIA goals."]}',8,3,'published'),
('cia-check','cia-triad','Understanding the CIA triad','shortQuiz','Match an incident to its impact.','{}',5,4,'published'),
('risk-walkthrough','cia-triad','Identify security risks in a fictional small business','guidedLab','Build a short risk register for a bakery.',
  '{"objective":"Record two evidence-based risks","prerequisites":["Read the CIA triad lesson"],"tools":["Text editor"],"setup":"Create a blank risk register.","safety":"Use only the supplied fictional information.","steps":[{"id":"assets","title":"List assets","instructions":"The bakery stores orders in one shared spreadsheet. Identify the information the bakery relies on.","expectedResult":"Order details recorded as an asset."},{"id":"risks","title":"Record risk and control","instructions":"Anyone on staff can edit orders, and no backup has been tested. Write one risk for each observation and suggest a control.","expectedResult":"Two entries with evidence, impact and a proposed control."}],"troubleshooting":"If a consequence is unclear, describe what the bakery would be unable to do."}',18,5,'published'),
('risk-review','cia-triad','Assess a fictional business scenario','independentLab','Write a short assessment for a bicycle repair shop.',
  '{"scenario":"Harbour Cycle Repairs uses a booking calendar shared with former staff. Its exported backup has never been restored.","objectives":["Prioritise practical improvements"],"tools":["Text editor or spreadsheet"],"tasks":["Identify two risks","Recommend one control per risk","Choose the first action and justify it"],"deliverables":["A two-row risk register and a short recommendation"],"checklist":[{"id":"evidence","label":"Each risk cites supplied evidence"},{"id":"priority","label":"The recommendation explains priority"}]}',22,6,'published'),
('chapter-check','cia-triad','Final chapter quiz','finalQuiz','Apply foundational security concepts to a business scenario.','{}',10,7,'published');

insert into public.quiz_questions (activity_id, id, question, question_type, options, sort_order)
values
('fundamentals','control','Which action is a security control?','single','[{"id":"a","label":"Restrict access to authorised staff"},{"id":"b","label":"Record orders in a spreadsheet"}]',1),
('cia-check','availability','A shop cannot retrieve its booking list. Is availability affected?','boolean','[{"id":"true","label":"True"},{"id":"false","label":"False"}]',1),
('chapter-check','disclosure','A former employee can still see customer bookings. Which objective is most directly affected?','single','[{"id":"c","label":"Confidentiality"},{"id":"i","label":"Integrity"},{"id":"a","label":"Availability"}]',1),
('chapter-check','controls','Which actions support recovery after losing access to the booking calendar?','multiple','[{"id":"backup","label":"Keep backups"},{"id":"restore","label":"Test restoring a backup"},{"id":"rename","label":"Rename the calendar"}]',2);

insert into private.quiz_keys (activity_id, question_id, correct_option_ids, explanation, hint)
values
('fundamentals','control','{a}','Access restrictions reduce the chance of unauthorised disclosure.','Which action reduces risk?'),
('cia-check','availability','{true}','Availability means being able to use information when needed.',null),
('chapter-check','disclosure','{c}','The scenario describes unauthorised viewing, which affects confidentiality.',null),
('chapter-check','controls','{backup,restore}','Backups provide a recovery copy. Restore tests show whether the copy is usable.',null);

insert into private.lab_solutions (activity_id, markdown)
values ('risk-review','Remove former staff from the shared calendar and verify the access list. Schedule a test restore and record the results. Prioritise revoking access because exposure is ongoing.');
