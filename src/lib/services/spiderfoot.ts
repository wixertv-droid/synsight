const SPIDERFOOT_URL = process.env.SPIDERFOOT_URL || "http://127.0.0.1:5001";

interface SpiderFootScanStatus {
  name: string;
  target: string;
  started: string;
  finished: string;
  status: string;
  correlations: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
    INFO: number;
  };
}

interface SpiderFootResult {
  timestamp: string;
  data: string;
  source: string;
  module: string;
  type: string;
}

export async function startSpiderFootScan(
  target: string,
  scanName = "SynSight Exposure Scan"
) {
  const body = new URLSearchParams({
    scanname: scanName,
    scantarget: target,
    usecase: "all",
  });

  const response = await fetch(`${SPIDERFOOT_URL}/startscan`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw new Error(
      `SpiderFoot start failed: ${response.status}`
    );
  }

  return await response.json();
}


export async function getSpiderFootStatus(
  scanId: string
): Promise<SpiderFootScanStatus> {

  const response = await fetch(
    `${SPIDERFOOT_URL}/scanstatus?id=${scanId}`
  );

  if (!response.ok) {
    throw new Error(
      `SpiderFoot status failed: ${response.status}`
    );
  }

  const data = await response.json();

  return {
    name: data[0],
    target: data[1],
    started: data[2],
    finished: data[4],
    status: data[5],
    correlations: data[6],
  };
}


export async function getSpiderFootResults(
  scanId: string
): Promise<SpiderFootResult[]> {

  const response = await fetch(
    `${SPIDERFOOT_URL}/scaneventresults?id=${scanId}`
  );

  if (!response.ok) {
    throw new Error(
      `SpiderFoot results failed: ${response.status}`
    );
  }

  const data = await response.json();


  return data.map((item: any[]) => ({
    timestamp: item[0],
    data: item[1],
    source: item[2],
    module: item[3],
    type: item[10],
  }));
}
