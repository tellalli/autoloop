# Extracted source: AutoLoop customer request to release

Source: `../AutoLoop customer request to release.docx`.

Extracted from the Word document on 2026-11-18. Paragraph IDs are for planning references. Consult the original document and its extracted diagram for layout and visual details.

[P001] AutoLoop: customer request to release

[P002] Nov 18, 2026 · @Alban

[P003] At a glance

[P004] AutoLoop takes a customer request from a chat in the app to a released feature in 11 steps: AI drafts and builds, and people decide what ships.

[P005] AutoLoop flow · 11 steps, 4 decisions by people

[P006] The flow runs left to right and wraps twice; each box names where the step happens.

[P007] Step by step

[P008] Steps 1 to 3 and 10 to 11 happen in the app; steps 4 to 9 happen in the GitHub repository.

[P009] Step

[P010] Where

[P011] Who

[P012] What happens

[P013] 1. Chat assistant

[P014] Your app

[P015] AI

[P016] Clarifies and confirms the request

[P017] 2. Request log (CSV)

[P018] Your app

[P019] Automated

[P020] Saved as Submitted

[P021] 3. Triage

[P022] Your app

[P023] A person decides

[P024] A person accepts, merges or declines

[P025] 4. GitHub issue

[P026] GitHub repository

[P027] Automated

[P028] Created for accepted requests

[P029] 5. Scope draft

[P030] GitHub repository

[P031] AI

[P032] Plan; questions about intent go to the customer

[P033] 6. Scope approval

[P034] GitHub repository

[P035] A person decides

[P036] A person adds the approved label

[P037] 7. Build

[P038] GitHub repository

[P039] AI

[P040] The agent works on a branch

[P041] 8. Pull request

[P042] GitHub repository

[P043] Automated

[P044] Code plus tests

[P045] 9. Code review

[P046] GitHub repository

[P047] A person decides

[P048] A person reviews and merges

[P049] 10. Customer preview

[P050] Your app

[P051] A person decides

[P052] The requester tries it behind a flag

[P053] 11. Release

[P054] Your app

[P055] Automated

[P056] Everyone gets it; status updated

[P057] Who does what

[P058] AI does three steps, people make four decisions, and four steps run on their own.

[P059] AI (3 steps): chat assistant, scope draft, build.

[P060] A person decides (4 steps): triage, scope approval, code review, customer preview.

[P061] Automated (4 steps): request log, GitHub issue, pull request, release.

[P062] Nothing is built until a person adds the approved label at step 6, and nothing ships until a person merges at step 9 and the requester has tried it at step 10.

[P063] Source: AutoLoop architecture whiteboard
