// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join, resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const pwsh = join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe');
const available = process.platform === 'win32' && existsSync(pwsh);
const requestId = 'REQ-566F1BEBDA7A';
const brief = `# Add Dashboard navigation\n\nRequest: ${requestId} · Revision: 1\n\n## Desired behavior\nWelcome the logged-in user by name.\n`;
const ready = { request_id: requestId, revision: 1, decision: 'ready', duplicate_issue_number: null,
  blocking_questions: [], title: 'Add Dashboard navigation — café', problem_and_desired_outcome: 'Make Dashboard discoverable.',
  scope: 'Frontend navigation and welcome page only; no new APIs.', acceptance_criteria: '- [ ] Dashboard opens and shows the name or username fallback.',
  implementation_context: 'Use src/api/auth.ts and useAuth().user.name; the login response already supplies the name.',
  verification: 'Test named-user and fallback greetings, mobile navigation, npm test, and npm run build.', open_questions: 'None.' };
const issue = (number: number, body = `Request: ${requestId} · Revision: 1`, title = 'Dashboard') =>
  ({ number, body, title, state: 'closed', url: `https://github.com/tellalli/autoloop/issues/${number}` });

let directory: string, script: string, source: string, statePath: string, mockBin: string;
type State = { calls: Array<{ tool: string; args: string[]; prompt?: string }>; issues: unknown[]; review: Record<string, unknown>;
  githubFail?: boolean; codexFail?: boolean; invalidJson?: boolean; finalIssues?: unknown[]; createdBody?: string; rawPages?: unknown[][] };
function saveState(overrides: Partial<State> = {}) {
  writeFileSync(statePath, JSON.stringify({ calls: [], issues: [], review: ready, githubFail: false, codexFail: false, invalidJson: false, ...overrides }), 'utf8');
}
function state(): State { return JSON.parse(readFileSync(statePath, 'utf8')); }
function run(extra: string[] = [], inputPath = source) {
  const env: NodeJS.ProcessEnv = { ...process.env, AUTOLOOP_GITBRIEF_TEST_STATE: statePath };
  const oldPath = process.env.Path || process.env.PATH || '';
  for (const key of Object.keys(env)) if (key.toLowerCase() === 'path') delete env[key];
  env.Path = mockBin + delimiter + oldPath;
  return spawnSync(pwsh, ['-NoLogo', '-NoProfile', '-File', script, '-BriefPath', inputPath, ...extra],
    { cwd: directory, env, encoding: 'utf8', timeout: 20_000 });
}

describe.skipIf(!available)('Git brief publisher with mocked CLIs', () => {
  beforeEach(() => {
    mkdirSync(resolve('.temp'), { recursive: true });
    directory = mkdtempSync(resolve('.temp', 'gitbrief-test-'));
    const scripts = join(directory, 'scripts'); mkdirSync(scripts);
    script = join(scripts, 'Publish-GitBrief.ps1');
    copyFileSync(resolve('scripts/Publish-GitBrief.ps1'), script);
    copyFileSync(resolve('scripts/gitbrief-issue.schema.json'), join(scripts, 'gitbrief-issue.schema.json'));
    mockBin = join(directory, 'mock cli'); mkdirSync(mockBin);
    source = join(directory, 'downloaded brief.md'); writeFileSync(source, brief, 'utf8');
    statePath = join(directory, 'state.json'); saveState();
    writeFileSync(join(mockBin, 'gh.ps1'), `
$cliArgs = @($args)
$state = Get-Content -Raw -LiteralPath $env:AUTOLOOP_GITBRIEF_TEST_STATE | ConvertFrom-Json -AsHashtable
$state.calls += @{ tool = 'gh'; args = $cliArgs }
if ($cliArgs[0] -eq 'api') {
  if ($cliArgs -contains '--slurp' -and ($cliArgs -contains '--jq' -or $cliArgs -contains '--template')) {
    [Console]::Error.WriteLine('the --slurp option is not supported with --jq or --template'); exit 1
  }
  $result = $state.issues
  if (@($state.calls | Where-Object { $_.tool -eq 'gh' -and $_.args[0] -eq 'api' }).Count -gt 1 -and $state.ContainsKey('finalIssues')) { $result = $state.finalIssues }
  $state | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $env:AUTOLOOP_GITBRIEF_TEST_STATE -Encoding utf8
  if ($state.githubFail) { [Console]::Error.WriteLine('HTTP 401: Requires authentication'); exit 1 }
  if ($state.ContainsKey('rawPages')) { ConvertTo-Json -InputObject $state.rawPages -Depth 20 -Compress }
  else {
    $rawEntries = @($result | ForEach-Object { @{ number = $_.number; title = $_.title; body = $_.body; state = $_.state; html_url = $_.url } })
    ConvertTo-Json -InputObject @(,$rawEntries) -Depth 20 -Compress
  }
  exit 0
}
if ($cliArgs[0] -eq 'issue' -and $cliArgs[1] -eq 'create') {
  $bodyArg = @($cliArgs | Where-Object { $_.StartsWith('--body-file=') })[0]
  $state.createdBody = Get-Content -Raw -LiteralPath $bodyArg.Substring('--body-file='.Length)
  $state | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $env:AUTOLOOP_GITBRIEF_TEST_STATE -Encoding utf8
  'https://github.com/tellalli/autoloop/issues/42'
  exit 0
}
throw 'Unexpected gh command'
`, 'utf8');
    writeFileSync(join(mockBin, 'codex.ps1'), `
$cliArgs = @($args)
$promptText = @($input) -join "\n"
$state = Get-Content -Raw -LiteralPath $env:AUTOLOOP_GITBRIEF_TEST_STATE | ConvertFrom-Json -AsHashtable
$state.calls += @{ tool = 'codex'; args = $cliArgs; prompt = $promptText }
$state | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $env:AUTOLOOP_GITBRIEF_TEST_STATE -Encoding utf8
if ($state.codexFail) { [Console]::Error.WriteLine('Mock Codex authentication failure'); exit 1 }
$reviewPath = $cliArgs[[array]::IndexOf($cliArgs, '--output-last-message') + 1]
if ($state.invalidJson) { Set-Content -LiteralPath $reviewPath -Value '{invalid' -Encoding utf8 }
else { $state.review | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $reviewPath -Encoding utf8 }
'Mock review completed'
exit 0
`, 'utf8');
  });

  afterEach(() => {
    if (!directory.startsWith(resolve('.temp') + sep)) throw new Error('Unexpected test directory.');
    rmSync(directory, { recursive: true, force: true });
  });

  it('reviews read-only, checks all paginated issues twice, and publishes with a literal body-file argument', () => {
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('https://github.com/tellalli/autoloop/issues/42');
    const actual = state();
    expect(actual.calls.map((entry) => entry.tool)).toEqual(['gh', 'codex', 'gh', 'gh']);
    expect(actual.calls[0].args).toContain('--paginate');
    expect(actual.calls[0].args).toContain('--slurp');
    expect(actual.calls[0].args).not.toContain('--jq');
    expect(actual.calls[0].args).toContain('repos/tellalli/autoloop/issues?state=all&per_page=100');
    expect(actual.calls[1].args).toContain('read-only');
    expect(actual.calls[1].prompt).toContain('AGENTS.md');
    expect(actual.calls[1].prompt).toContain('Do not edit code/files');
    expect(actual.createdBody).toContain(`Request: ${requestId} · Revision: 1`);
    for (const section of ['Problem and desired outcome', 'Scope', 'Acceptance criteria', 'Relevant implementation context', 'Verification']) {
      expect(actual.createdBody).toContain('## ' + section);
    }
    expect(actual.createdBody).toContain('username fallback');
    expect(readFileSync(source, 'utf8')).toBe(brief);
    expect(existsSync(join(directory, '.data', 'gitbrief', 'runs'))).toBe(true);
    expect(existsSync(join(directory, '.gitbrief'))).toBe(false);
  });

  it.each(['open', 'closed'])('returns an existing %s Request ID match without invoking Codex or publishing', (stateName) => {
    saveState({ issues: [{ ...issue(10), state: stateName }] });
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('/issues/10');
    expect(state().calls.map((entry) => entry.tool)).toEqual(['gh']);
  });

  it('reports a revision difference without overwriting or duplicating the existing issue', () => {
    saveState({ issues: [issue(10, `Request: ${requestId} · Revision: 2`)] });
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('differs from brief revision 1');
    expect(state().calls).toHaveLength(1);
  });

  it('returns a semantic duplicate even when it has no Request ID', () => {
    saveState({ issues: [issue(15, 'Already implements Dashboard navigation.')], review: { ...ready, decision: 'duplicate', duplicate_issue_number: 15 } });
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('/issues/15');
    expect(state().calls).toHaveLength(2);
  });

  it('finds a duplicate on a later raw API page while ignoring pull requests', () => {
    const { url: ignored, ...matching } = issue(21);
    void ignored;
    saveState({ rawPages: [
      [{ number: 20, title: 'Same request PR', body: `Request: ${requestId} · Revision: 1`,
        state: 'open', html_url: 'https://github.com/tellalli/autoloop/pull/20', pull_request: { url: 'pull/20' } }],
      [{ ...matching, html_url: 'https://github.com/tellalli/autoloop/issues/21' }],
    ] });
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('/issues/21');
    expect(state().calls).toHaveLength(1);
  });

  it('accepts empty API pages and nullable issue bodies', () => {
    saveState({ rawPages: [[], [{ number: 22, title: 'Unrelated issue', body: null, state: 'open',
      html_url: 'https://github.com/tellalli/autoloop/issues/22' }]] });
    const result = run(['-DryRun']);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(state().calls).toHaveLength(2);
  });

  it('prepares a dry run without creating an issue', () => {
    const result = run(['-DryRun']);
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('No issue was created');
    expect(state().calls).toHaveLength(2);
    expect(state().createdBody).toBeUndefined();
  });

  it.each([
    { githubFail: true }, { codexFail: true }, { invalidJson: true },
    { review: { ...ready, revision: 2 } }, { review: { ...ready, verification: '' } },
    { review: { ...ready, decision: 'duplicate', duplicate_issue_number: 999 } },
    { review: { ...ready, decision: 'needs_clarification', blocking_questions: ['Which page should be replaced?'] } },
  ])('does not publish on a CLI failure or unusable review: %j', (scenario) => {
    saveState(scenario);
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(state().createdBody).toBeUndefined();
    expect(readFileSync(source, 'utf8')).toBe(brief);
  });

  it('returns an exact duplicate that appears during review', () => {
    saveState({ finalIssues: [issue(99)] });
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stdout).toContain('/issues/99');
    expect(state().createdBody).toBeUndefined();
  });

  it('stops if other issues change while Codex reviews the initial snapshot', () => {
    saveState({ finalIssues: [issue(99, 'Another feature, requiring a fresh duplicate review.')] });
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('issue list changed');
    expect(state().createdBody).toBeUndefined();
  });

  it('passes shell punctuation and Unicode literally without executing generated content', () => {
    const title = 'Dashboard "café"; $(throw "should not execute")';
    saveState({ review: { ...ready, title } });
    const result = run();
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(state().calls.at(-1)!.args).toContain('--title=' + title);
  });

  it('reports a missing file before any CLI calls', () => {
    const result = run([], join(directory, 'missing.md'));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Brief file not found');
    expect(state().calls).toHaveLength(0);
  });
});
