import { CfnElement, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Code, Function as LambdaFn, Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { test } from "vitest";

test("Stack has resources", () => {
  const stack = new Stack();

  const queue = new Queue(stack, "MyQueue");

  const fn = new LambdaFn(stack, "MyFunction", {
    code: Code.fromInline("exports.handler = function() { return {}; }"),
    handler: "index.handler",
    runtime: Runtime.NODEJS_18_X,
  });

  fn.addEventSource(new SqsEventSource(queue));

  const role = new Role(stack, "Role", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
  });

  const eventBus = new EventBus(stack, "EventBus");

  eventBus.grantPutEventsTo(role);

  // expect(role).toHavePermission(eventBus.grantPutEventsTo);
  Template.fromStack(stack).hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: [
        {
          Action:
            eventBus.grantPutEventsTo(role).principalStatements[0].actions[0],
          Effect: eventBus.grantPutEventsTo(role).principalStatements[0].effect,
          Resource: {
            "Fn::GetAtt": [
              stack.getLogicalId(eventBus.node.defaultChild as CfnElement),
              "Arn",
            ],
          },
        },
      ],
      Version: "2012-10-17",
    },
    Roles: [
      {
        Ref: stack.getLogicalId(role.node.defaultChild as CfnElement),
      },
    ],
  });

  // expect(fn).toHaveTrigger(queue)
  // https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/aws-lambda-event-sources/test/sqs.test.ts
});
