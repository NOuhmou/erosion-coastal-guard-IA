# QA Deliverables

This directory groups the QA artefacts prepared for Erosion Coastal Guard IA.

## Documents
- checklist_recette.md: manual validation checklist.
- rapport_qa.md: consolidated QA summary and execution status.
- rapport_precision_gps.md: comparison of GPS distance precision.
- rapport_transparence_ai.md: summary of AI-generated prompts, deviations and corrections.

## Scope
The QA work covers:
- zone creation and editing
- automatic point bootstrap for new zones
- history creation and editing
- retreat recomputation and status updates
- dashboard consistency
- sensor and permit administration
- authentication, RBAC and audit logging

## Regression focus
The validation set is aligned with the documented corrections in suivi-realisations.md, especially the items related to:
- retreat calculation and latest measurement selection
- automatic creation of points during zone/history workflows
- dashboard consistency
- sensors and permits coverage

## Test levels
- Functional testing
- Regression testing
- Security testing
- Data consistency testing
- Basic performance checks