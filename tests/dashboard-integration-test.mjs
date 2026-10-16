import assert from "node:assert/strict";
import { test, describe } from "node:test";
import mongoose from "mongoose";

const BASE_URL = "http://localhost:3000";
const ADMIN_EMAIL = "admin@saqafees.org";
const ADMIN_PASSWORD = "Admin@Saqafees2026!";

describe("Admin Dashboard & API Verification", () => {
  let adminCookie = "";
  let testRegId = "";

  test("1. Admin Login and Cookie Authentication", async () => {
    const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    assert.equal(loginRes.status, 200, "Admin login should succeed with 200");
    const loginData = await loginRes.json();
    assert.equal(loginData.success, true);
    assert.equal(loginData.user.role, "admin");

    const setCookie = loginRes.headers.get("set-cookie");
    assert.ok(setCookie, "Login response must set session cookie");
    adminCookie = setCookie.split(";")[0];
  });

  test("2. Create Test Registration for Admin Dashboard Testing", async () => {
    const testPhone = "98460" + Math.floor(10000 + Math.random() * 90000);
    const regRes = await fetch(`${BASE_URL}/api/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Admin Dashboard Test Participant",
        place: "Koduvally",
        district: "Kozhikode",
        mobile: testPhone,
        shuhba: "HADEES",
        participateFully: true,
        wantsFood: false,
      }),
    });

    assert.equal(regRes.status, 201, "Registration should succeed with 201");
    const regData = await regRes.json();
    assert.ok(regData.registrationId);
    testRegId = regData.registrationId;
  });

  test("3. Registration Filters: Participation and Food Filters", async () => {
    // 3a. Filter participateFully=yes
    const resYes = await fetch(
      `${BASE_URL}/api/admin/participants?participateFully=yes`,
      { headers: { Cookie: adminCookie } }
    );
    assert.equal(resYes.status, 200);
    const dataYes = await resYes.json();
    assert.ok(Array.isArray(dataYes.participants));
    dataYes.participants.forEach((p) => {
      assert.equal(p.participateFully, true);
    });

    // 3b. Filter wantsFood=no
    const resNoFood = await fetch(
      `${BASE_URL}/api/admin/participants?wantsFood=no`,
      { headers: { Cookie: adminCookie } }
    );
    assert.equal(resNoFood.status, 200);
    const dataNoFood = await resNoFood.json();
    dataNoFood.participants.forEach((p) => {
      assert.equal(p.wantsFood, false);
    });

    // 3c. Combined Filters: participateFully=yes & wantsFood=no
    const resCombined = await fetch(
      `${BASE_URL}/api/admin/participants?participateFully=yes&wantsFood=no`,
      { headers: { Cookie: adminCookie } }
    );
    assert.equal(resCombined.status, 200);
    const dataCombined = await resCombined.json();
    assert.ok(dataCombined.pagination.total >= 1);
    assert.ok(dataCombined.overallTotal >= dataCombined.pagination.total);

    const foundTestParticipant = dataCombined.participants.find(
      (p) => p.registrationId === testRegId
    );
    assert.ok(foundTestParticipant, "Created test participant should be found in combined filtered results");
  });

  test("4. Department-wise Statistics and Sum Verification", async () => {
    const statsRes = await fetch(`${BASE_URL}/api/admin/stats`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();

    const expectedDepts = [
      "HADEES",
      "THAFSEER",
      "SHAREEA",
      "ILUMU NAFS",
      "IMUL IDARA",
      "THAKHASSUS",
      "WIRAS",
      "LUGA",
    ];

    let sum = 0;
    expectedDepts.forEach((dept) => {
      assert.ok(stats.shuhbaStats[dept] !== undefined, `Department ${dept} must exist in stats`);
      assert.ok(typeof stats.shuhbaStats[dept].total === "number");
      assert.ok(typeof stats.shuhbaStats[dept].checkedIn === "number");
      assert.ok(typeof stats.shuhbaStats[dept].percentage === "number");
      sum += stats.shuhbaStats[dept].total;
    });

    assert.equal(sum, stats.summary.totalRegistrations, "Sum of department counts must match overall total registrations");
  });

  test("5. Delete Functionality: Authorization, MongoDB Deletion & Cascade Verification", async () => {
    // 5a. Unauthorized delete attempt should fail (401 or 403)
    const unauthRes = await fetch(`${BASE_URL}/api/admin/participants/${testRegId}`, {
      method: "DELETE",
    });
    assert.ok(
      unauthRes.status === 401 || unauthRes.status === 403,
      "Unauthorized delete request must be rejected"
    );

    // 5b. Authorized delete using registration ID (testing fix for CastError)
    const deleteRes = await fetch(`${BASE_URL}/api/admin/participants/${testRegId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert.equal(deleteRes.status, 200, "Delete must succeed with HTTP 200");
    const deleteData = await deleteRes.json();
    assert.equal(deleteData.success, true);

    // 5c. Subsequent GET for deleted participant should return 404
    const getRes = await fetch(`${BASE_URL}/api/admin/participants/${testRegId}`, {
      headers: { Cookie: adminCookie },
    });
    assert.equal(getRes.status, 404, "Deleted participant should return 404");

    // 5d. Subsequent DELETE should return 404
    const repeatDeleteRes = await fetch(`${BASE_URL}/api/admin/participants/${testRegId}`, {
      method: "DELETE",
      headers: { Cookie: adminCookie },
    });
    assert.equal(repeatDeleteRes.status, 404, "Subsequent DELETE should return 404 not found");
  });
});
