import { useMsal } from "@azure/msal-react";
import * as XLSX from "xlsx";
import { useEffect, useState } from "react";

function useBannerImageMapServier() {
  const { instance, accounts } = useMsal();
  const [bannerImageMap, setBannerImageMap] = useState({});
  const [needsConsent, setNeedsConsent] = useState(false);
  const [lastModified, setLastModified] = useState(null);
  const [siteId, setSiteId] = useState(null);
  const [driveId, setDriveId] = useState(null);
  const POLL_INTERVAL = 60000; // 60 seconds

  // SharePoint file details
  const itemPath = "/Banner Visuals Servier.xlsx";

  useEffect(() => {
    let poller;

    async function fetchExcel() {
      const account = accounts[0];
      try {
        const response = await instance.acquireTokenSilent({
          scopes: ["Files.Read.All", "Sites.Read.All"], // Updated scopes
          account,
        });
        const accessToken = response.accessToken;

        const siteIdFetched = await getSiteId(accessToken);
        setSiteId(siteIdFetched);
        const driveIdFetched = await getDriveId(accessToken, siteIdFetched);
        setDriveId(driveIdFetched);

        await listDriveRoot(accessToken, driveIdFetched);
        await fetchAndParseExcel(accessToken, driveIdFetched);
      } catch (error) {
        if (
          error.errorCode === "consent_required" ||
          error.errorCode === "interaction_required"
        ) {
          setNeedsConsent(true);
        } else {
          console.error("[BannerImageMap] Token acquisition error:", error);
          throw error;
        }
      }
    }

    if (accounts.length > 0) {
      fetchExcel();

      // Poll for changes
      poller = setInterval(async () => {
        if (!driveId) {
          console.warn("[BannerImageMap] Polling skipped: driveId not ready yet.");
          return;
        }

        const account = accounts[0];
        try {
          const response = await instance.acquireTokenSilent({
            scopes: ["Files.Read.All", "Sites.Read.All"],
            account,
          });
          const accessToken = response.accessToken;

          const metaUrl = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${itemPath}`;
          const metaResp = await fetch(metaUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!metaResp.ok) {
            console.error(
              "[BannerImageMap] Polling: failed to get file metadata:",
              metaResp.status,
              metaResp.statusText
            );
            return;
          }

          const meta = await metaResp.json();
          if (
            meta.lastModifiedDateTime &&
            meta.lastModifiedDateTime !== lastModified
          ) {
            console.log("[BannerImageMap] Detected Excel file change, reloading...");
            setLastModified(meta.lastModifiedDateTime);
            await fetchAndParseExcel(accessToken, driveId);
          }
        } catch (err) {
          console.error("[BannerImageMap] Polling error:", err);
        }
      }, POLL_INTERVAL);
    }

    return () => {
      if (poller) clearInterval(poller);
    };
  }, [instance, accounts, driveId, lastModified]);

  async function fetchAndParseExcel(accessToken, driveIdParam) {
    const metaUrl = `https://graph.microsoft.com/v1.0/drives/${driveIdParam}/root:${itemPath}`;
    const contentUrl = `${metaUrl}:/content`;

    try {
      const metaResp = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (metaResp.ok) {
        const meta = await metaResp.json();
        if (meta.lastModifiedDateTime) {
          setLastModified(meta.lastModifiedDateTime);
        }
      }
    } catch (err) {
      console.error("[BannerImageMap] Error fetching file metadata:", err);
    }

    const fileResponse = await fetch(contentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!fileResponse.ok) {
      console.error(
        "[BannerImageMap] File fetch failed:",
        fileResponse.status,
        fileResponse.statusText
      );
      return;
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const map = {};
    data.forEach((row) => {
      if (row["Banner Name"] && row["Link to Visual"]) {
        map[row["Banner Name"]] = row["Link to Visual"];
      }
    });

    setBannerImageMap(map);
    setNeedsConsent(false);
  }

  // Request consent manually if needed
  async function requestConsent() {
    const account = accounts[0];
    const response = await instance.acquireTokenPopup({
      scopes: ["Files.Read.All", "Sites.Read.All"],
      account,
    });
    await fetchAndParseExcel(response.accessToken, driveId);
  }

  return { bannerImageMap, needsConsent, requestConsent };
}

async function getSiteId(accessToken) {
  const url =
    "https://graph.microsoft.com/v1.0/sites/indegene123.sharepoint.com:/sites/CopilotAPIWebApp";
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error("Failed to get site ID");
  const data = await resp.json();
  return data.id;
}

async function getDriveId(accessToken, siteId) {
  const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error("Failed to get drives");
  const data = await resp.json();
  // Find the drive named 'Documents' or 'Shared Documents'
  const drive = data.value.find(
    (d) => d.name === "Documents" || d.name === "Shared Documents"
  );
  if (!drive) throw new Error("Could not find Documents drive");
  return drive.id;
}

async function listDriveRoot(accessToken, driveId) {
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root/children`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    console.error("Failed to list drive root:", resp.status, resp.statusText);
    return;
  }
  const data = await resp.json();
  console.log(
    "[BannerImageMap] Files/folders in drive root:",
    data.value.map((f) => f.name)
  );
}

export default useBannerImageMapServier;
