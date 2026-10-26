const NOTION_ENDPOINT = "https://api.notion.com/v1";

function parseNotionConfig(argument) {
  if (typeof argument !== "string" || !argument.trim()) {
    throw new Error("Missing Surge script argument.");
  }

  let config;

  try {
    config = JSON.parse(argument);
  } catch (error) {
    throw new Error(`Invalid JSON in Surge script argument: ${String(error)}`);
  }

  const requiredFields = [
    ["accessToken", config.accessToken],
    ["version", config.version],
    ["dataSourceId.subscriptions", config.dataSourceId?.subscriptions],
    ["dataSourceId.transactions", config.dataSourceId?.transactions],
  ];
  const missingFields = requiredFields
    .filter(([, value]) => typeof value !== "string" || !value.trim())
    .map(([name]) => name);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing Notion config field(s): ${missingFields.join(", ")}`
    );
  }

  return {
    accessToken: config.accessToken.trim(),
    version: config.version.trim(),
    dataSourceId: {
      subscriptions: config.dataSourceId.subscriptions.trim(),
      transactions: config.dataSourceId.transactions.trim(),
    },
  };
}

let notionConfig;
let notionConfigError;

try {
  notionConfig = parseNotionConfig(
    typeof $argument === "undefined" ? undefined : $argument
  );
} catch (error) {
  notionConfig = null;
  notionConfigError = error;
  console.log(error.message || String(error));
}

const formatNotification = (isSuccess, message = "") => [
  `${$script.name} ${isSuccess ? "Succeeded" : "Failed"}`,
  "",
  String(message),
];

const notionHeaders = {
  Authorization: notionConfig ? `Bearer ${notionConfig.accessToken}` : "",
  "Notion-Version": notionConfig ? notionConfig.version : "",
  "Content-Type": "application/json",
  Accept: "application/json",
};

function postNotion(path, body) {
  return new Promise((resolve, reject) => {
    $httpClient.post(
      {
        url: `${NOTION_ENDPOINT}${path}`,
        headers: notionHeaders,
        body: JSON.stringify(body),
        timeout: 30,
      },
      (error, response, data) => {
        if (error) {
          reject(new Error(String(error)));
          return;
        }

        let result = {};

        try {
          result = data ? JSON.parse(data) : {};
        } catch (parseError) {
          reject(
            new Error(
              `Invalid JSON response (HTTP ${response.status}): ${String(
                parseError
              )}`
            )
          );
          return;
        }

        if (response.status < 200 || response.status >= 300) {
          reject(
            new Error(
              `HTTP ${response.status}: ${
                result.message || data || "Unknown Notion API error"
              }`
            )
          );
          return;
        }

        resolve(result);
      }
    );
  });
}

async function queryAllSubscriptions() {
  const subscriptions = [];
  let startCursor;

  do {
    const body = { page_size: 100 };

    if (startCursor) {
      body.start_cursor = startCursor;
    }

    const result = await postNotion(
      `/data_sources/${notionConfig.dataSourceId.subscriptions}/query`,
      body
    );

    subscriptions.push(...(result.results || []));
    startCursor = result.has_more ? result.next_cursor : null;
  } while (startCursor);

  return subscriptions;
}

function getTitle(page, propertyName) {
  const items = page.properties[propertyName]?.title || [];
  return items.map((item) => item.plain_text || "").join("").trim();
}

function getRelation(page, propertyName) {
  const relation = page.properties[propertyName]?.relation || [];
  return relation.map((item) => ({ id: item.id }));
}

function getTriggerDate() {
  const rawStartTime =
    typeof $script.startTime !== "undefined" ? $script.startTime : Date.now();
  const normalizedStartTime =
    typeof rawStartTime === "number" && rawStartTime < 100000000000
      ? rawStartTime * 1000
      : rawStartTime;
  const startTime = new Date(normalizedStartTime);

  const date = Number.isNaN(startTime.getTime()) ? new Date() : startTime;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return {
    dayOfMonth: date.getDate(),
    dateString: `${year}-${month}-${day}`,
  };
}

function isDueActiveSubscription(subscription, dayOfMonth) {
  const properties = subscription.properties || {};
  const status = properties.Status?.select?.name;
  const billingDate = properties["Billing Date"]?.number;

  return status === "Active" && billingDate === dayOfMonth;
}

async function createTransaction(subscription, dateString) {
  const properties = subscription.properties || {};
  const name = getTitle(subscription, "Name") || "Unnamed subscription";
  const transactionType = properties.Transaction?.select?.name;
  const price = properties.Price?.number;

  if (!transactionType) {
    throw new Error(`${name}: Transaction select is empty`);
  }

  if (typeof price !== "number") {
    throw new Error(`${name}: Price is not a number`);
  }

  return postNotion("/pages", {
    parent: {
      type: "data_source_id",
      data_source_id: notionConfig.dataSourceId.transactions,
    },
    properties: {
      Name: {
        title: [{ text: { content: name } }],
      },
      Type: {
        select: { name: transactionType },
      },
      Budget: {
        relation: getRelation(subscription, "Budget"),
      },
      Account: {
        relation: getRelation(subscription, "Accounts"),
      },
      Date: {
        date: { start: dateString },
      },
      rawAmount: {
        number: price,
      },
    },
  });
}

async function main() {
  if (!notionConfig) {
    throw notionConfigError || new Error("Invalid Notion configuration.");
  }

  const { dayOfMonth, dateString } = getTriggerDate();
  const subscriptions = await queryAllSubscriptions();
  const dueSubscriptions = subscriptions.filter((subscription) =>
    isDueActiveSubscription(subscription, dayOfMonth)
  );

  let createdCount = 0;
  const failures = [];

  // 顺序创建，降低触发 Notion API 速率限制的概率。
  for (const subscription of dueSubscriptions) {
    try {
      await createTransaction(subscription, dateString);
      createdCount += 1;
    } catch (error) {
      const name = getTitle(subscription, "Name") || subscription.id;
      failures.push(`${name}: ${error.message || String(error)}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Created ${createdCount}/${dueSubscriptions.length} transaction(s). ${failures.join(
        " | "
      )}`
    );
  }

  $notification.post(
    ...formatNotification(
      true,
      `Checked ${subscriptions.length} subscription(s); created ${createdCount} transaction(s) for ${dateString}.`
    )
  );
}

main()
  .catch((error) => {
    console.log(error.stack || String(error));
    $notification.post(...formatNotification(false, error.message || String(error)));
  })
  .finally(() => {
    $done();
  });
