# Skill evals

Opt-in checks that a real agent session routes a request the way a skill says it should. Each `evals/<skill>/scenarios.json` follows the shape in Anthropic's [skill authoring guide](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices#build-evaluations-first): the skills under test, an organic `query`, and the `expected_behavior` a reader grades by hand. `expect_reads`, `expect_no_reads`, and `expect_no_tools` are the parts `tests/skill-evals.test.mjs` grades by itself, from the files and tools the session really used, never from the agent's own report, as the Eval playbook in `poteto-mode` requires.

`bun test tests/` checks only the scenario files' shape. The live run is skipped unless `PSTACK_SKILL_EVALS=1`. It needs a signed-in `claude` CLI and makes one model call chain per scenario:

```shell
PSTACK_SKILL_EVALS=1 bun test tests/skill-evals.test.mjs
```

`PSTACK_SKILL_EVALS_MODEL` picks the model (default `haiku`). Each scenario copies `fixture/` into a throwaway directory with a project-shaped name, so the session never sees the word eval.
