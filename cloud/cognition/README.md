# cloud/cognition — not yet deployed

Planned Lambda model proxy from
[`08-AWS-INFRASTRUCTURE.md`](../../0.%20documentation/08-AWS-INFRASTRUCTURE.md):
Cognito -> API Gateway HTTP API -> Lambda -> Bedrock, with a DynamoDB
budget/request ledger, matching the `POST /v1/cognition` contract in
[`10-API-CONTRACTS.md`](../../0.%20documentation/10-API-CONTRACTS.md) section 8.

**Current state:** nothing is deployed. No AWS account/region has been
configured from this workspace, and deploying real infrastructure and
spending real credit is an action this baseline intentionally does not take
without your explicit go-ahead.

`packages/agent-runtime/src/agents/conversation.ts` defines a `CognitionPort`
interface with a `NullCognitionPort` implementation that returns an honest
"cloud reasoning isn't connected yet" message instead of fabricating a
response. Once this stack is deployed, implement a `BedrockCognitionPort`
against the same interface and inject it into `KlipAgentRuntime`.

**To build this out:** see docs 08 and 10, plus `infra/README.md` for the
CDK stack this Lambda belongs to.
