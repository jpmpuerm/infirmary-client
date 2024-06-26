import decodeJWT from "jwt-decode";
import axios from "axios";
import qs from "qs";

const COMMUNICATION_ERROR = {
  code: 0,
  name: "Unable to connect to the API server.",
};

const OK = { code: 200, name: "Success." };

const BAD_REQUEST = {
  code: 400,
  name: "Invalid/Malformed request parameters.",
};
// FOR UNAUTHORIZED ACCESS
const UNAUTHORIZED = {
  code: 401,
  name: "You are not allowed to access this data.",
};
// FOR UNAUTHENTICATED ACCESS
const FORBIDDEN = {
  code: 403,
  name: "Token is invalid/expired or you've been logged into another device.",
};

const NOT_FOUND = { code: 404, name: "Resource not found." };
const TIMEOUT = { code: 408, name: "Request Timed out." };

const INTERNAL_SERVER_ERROR = {
  code: 500,
  name: "Oops. Error occurred in the API server.",
};

export const httpResponseStatusCodesMap = {
  COMMUNICATION_ERROR,
  OK,
  BAD_REQUEST,
  UNAUTHORIZED,
  FORBIDDEN,
  NOT_FOUND,
  TIMEOUT,
  INTERNAL_SERVER_ERROR,
  [COMMUNICATION_ERROR.code]: COMMUNICATION_ERROR,
  [OK.code]: OK,
  [BAD_REQUEST.code]: BAD_REQUEST,
  [UNAUTHORIZED.code]: UNAUTHORIZED,
  [FORBIDDEN.code]: FORBIDDEN,
  [NOT_FOUND.code]: NOT_FOUND,
  [TIMEOUT.code]: TIMEOUT,
  [INTERNAL_SERVER_ERROR.code]: INTERNAL_SERVER_ERROR,
};

export const formatDate = (date, options) => {
  if (!options) options = {};

  // `date` can be a JS date or an ISO date string
  if (!date) return "";

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const dt = isDate(date) ? date : new Date(date);
  const year = new Intl.DateTimeFormat("en", { year: "numeric" }).format(dt);
  const month = new Intl.DateTimeFormat("en", { month: "short" }).format(dt);
  const day = new Intl.DateTimeFormat("en", { day: "2-digit" }).format(dt);

  let minute = dt.getMinutes();
  let hour = dt.getHours();

  const ampm = hour > 11 ? "PM" : "AM";

  if (minute < 10) minute = `0${minute}`;

  if (hour === 0) {
    hour = 12;
  } else if (hour > 12) {
    hour -= 12;
  }

  const time = `${hour}:${minute} ${ampm}`;
  const dayName = days[dt.getDay()];

  if (options.withDayName)
    return `${dayName.toUpperCase()}, ${month.toUpperCase()} ${day}, ${year} ${time}`;
  else if (options.dateOnly) return `${month.toUpperCase()} ${day}, ${year}`;

  return `${month.toUpperCase()} ${day}, ${year} ${time}`;
};

// formatDate TEST CASES
// console.log(
//   "2024-02-27 00:36:00",
//   " -> ",
//   formatDate({ date: "2024-02-27 00:36:00" })
// );

// console.log(
//   "2024-02-27 01:36:00",
//   " -> ",
//   formatDate({ date: "2024-02-27 01:36:00" })
// );

// console.log(
//   "2024-02-27 17:00:00",
//   " -> ",
//   formatDate({ date: "2024-02-27 17:00:00" })
// );

// console.log(
//   "2024-02-27 11:36:00",
//   " -> ",
//   formatDate({ date: "2024-02-27 11:36:00" })
// );

// console.log(
//   "2024-02-27 12:30:00",
//   " -> ",
//   formatDate({ date: "2024-02-27 12:30:00" })
// );

export const empty = (arg) => {
  if (isDate(arg)) return false;

  return (
    arg === null ||
    arg === undefined ||
    arg === "" ||
    isArrAndEmpty(arg) ||
    isObjAndEmpty(arg)
  );
};

export const isArrAndEmpty = (arg) => {
  return isArr(arg) && arrEmpty(arg);
};

export const isArr = (arg) => {
  return Array.isArray(arg);
};

// For performance, this method does not check if `arr` is really an array.
// Use `isArr` before calling this method, to check if `arr` is really an array.
export const arrEmpty = (arr) => {
  return arr.length === 0;
};

export const isObjAndEmpty = (arg) => {
  return isObj(arg) && objEmpty(arg);
};

export const isObj = (val) => {
  return Object.prototype.toString.call(val) === "[object Object]";
};

export const isMap = isObj;

export const isDate = (arg) => {
  return Object.prototype.toString.call(arg) === "[object Date]";
};

// For performance, this method does not check if `obj` is really an object.
// Use `isObj` before calling this method, to check if `obj` is really an object.
export const objEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

export const isStr = (arg) => {
  return typeof arg === "string";
};

export const isPrimitive = (val) => {
  return (typeof val !== "object" && typeof val !== "function") || val === null;
};

export const isFlat = (obj) => {
  if (isPrimitive(obj)) throw "`obj` should not be a primitive.";

  for (const key in obj) {
    if (!isPrimitive(obj[key])) return false;
  }

  return true;
};

// Used to sort array of strings or objects (with string property to be used for sorting) IN PLACE
export const sortStringArr = (arr, key = null, descending = false) => {
  const ret1 = descending ? -1 : 1;
  const ret2 = descending ? 1 : -1;

  arr.sort((a, b) =>
    (a[key] ?? a) > (b[key] ?? b)
      ? ret1
      : (a[key] ?? a) < (b[key] ?? b)
      ? ret2
      : 0
  );
};

export const buildHashTable = (arr, keyProp = "key", valueProp = null) => {
  if (arr == null || !Array.isArray(arr))
    throw "`arr` argument is required and should be an array.";

  // If valueProp is not supplied, whole item will be the value.
  // To avoid headache, supply only array of FLAT objects to the `arr` argument.
  return arr.reduce((map, item) => {
    map[item[keyProp]] = valueProp === null ? { ...item } : item[valueProp];
    return map;
  }, {});
};

export const delay = (ms) => {
  return new Promise((res) => setTimeout(() => res(), ms));
};

export const decodeUserJWT = (jwt) => {
  if (jwt) {
    const user = decodeJWT(jwt);
    user["accessToken"] = jwt;
    return user;
  }

  return null;
};

export const request = async (
  method,
  url,
  urlQuery,
  accessToken,
  payload,
  vuexContext
) => {
  if (!method) method = "get";
  if (!url) throw "`url` is required.";
  if (!accessToken) accessToken = null;

  const opts = {
    timeout: 30000,
    method,
    url: `${url}${urlQuery ? "?".concat(qs.stringify(urlQuery)) : ""}`,
    headers: {
      authorization: accessToken ? `Bearer ${accessToken}` : "",
      "Content-Type":
        payload instanceof FormData
          ? "multipart/form-data"
          : "application/json",
    },
    // data: payload
    //   ? payload instanceof FormData
    //     ? payload
    //     : JSON.stringify(payload)
    //   : null,
    ...(payload ? { data: payload } : {}),
  };

  try {
    return { body: (await axios(opts)).data };
  } catch (error) {
    // if (
    //   vuexContext &&
    //   error.response?.status === httpResponseStatusCodesMap.UNAUTHORIZED.code
    // ) {
    //   await vuexContext.dispatch("app/clearUser", null, { root: true });
    // }

    return {
      error: true,
      status: error.response?.status ?? 0,
      body:
        error.response?.data ??
        error.response?.statusText ??
        "Unable to connect to the REST API server.",
    };
  }
};

export const wrapCsvValue = (val, formatFn, row) => {
  let formatted = formatFn !== void 0 ? formatFn(val, row) : val;

  formatted =
    formatted === void 0 || formatted === null ? "" : String(formatted);

  formatted = formatted.split('"').join('""');
  /**
   * Excel accepts \n and \r in strings, but some other CSV parsers do not
   * Uncomment the next two lines to escape new lines
   */
  // .split('\n').join('\\n')
  // .split('\r').join('\\r')

  return `"${formatted}"`;
};

export const showMessage = (q, successful, message) => {
  q.notify({
    progress: true,
    message,
    color: successful ? "positive" : "negative",
  });
};

export const subtractDay = (date, val) => {
  return new Date(date.setDate(date.getDate() - val));
};

export const jsDateToISOString = (jsDate, dateOnly = false, utc = false) => {
  if (utc) {
    if (dateOnly) return jsDate.toISOString().substring(0, 10);
    else return jsDate.toISOString();
  }

  const year = String(jsDate.getFullYear());
  const month = String(jsDate.getMonth() + 1).padStart(2, "0");
  const date = String(jsDate.getDate()).padStart(2, "0");
  const hours = String(jsDate.getHours()).padStart(2, "0");
  const minutes = String(jsDate.getMinutes()).padStart(2, "0");
  const seconds = String(jsDate.getSeconds()).padStart(2, "0");
  const ms = String(jsDate.getMilliseconds()).padStart(3, "0");

  if (dateOnly) return `${year}-${month}-${date}`;

  return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}.${ms}`;
};

// "Safely" adds prop to `obj` if `val` is not "empty". Modifies the `obj` in place.
export const addProp = (val, propName, obj, format = null) => {
  if (!empty(val)) obj[propName] = format ? format(val) : val;
};

export const removeEmptyProp = (obj) => {
  const ret = {};

  for (const key in obj) {
    if (!empty(obj[key])) ret[key] = obj[key];
  }

  return ret;
};

export const removeHTMLTags = (strToSanitize) => {
  return strToSanitize
    .replace(/<br>/g, "\n")
    .replace(/(&[a-z]+;|&#[0-9]+;)/g, "")
    .replace(/<\/?[^>]+>/gi, "");
};

export const formatLabResultRows = (rows) => {
  // Merge rows containing the SI and Conv Values
  const localDiagRows = [];
  const convValues = [];
  const siValues = [];

  for (const row of rows) {
    const param = {
      ...row,
      diagParamValue: removeHTMLTags(row.diagParamValue),
      diagDate: row.diagDate
        ? jsDateToISOString(new Date(row.diagDate)).substring(0, 19)
        : null,
    };

    const isConventional =
      param.diagParamMetric &&
      param.diagParamMetric.toUpperCase() === "CONVENTIONAL";

    if (isConventional) {
      convValues.push(param);
    } else {
      siValues.push(param);
    }
  }

  for (const siValue of siValues) {
    const newLocalDiagRow = {
      ...siValue,
    };

    const convValue = convValues.find(
      (val) =>
        val.diagParamCode === siValue.diagParamCode && val.code === siValue.code
    );

    if (convValue) {
      newLocalDiagRow["diagParamConvValue"] = convValue.diagParamValue;

      newLocalDiagRow["diagParamConvNormalRange"] =
        convValue.diagParamRefNormalRange;

      newLocalDiagRow["diagParamConvMetric"] = convValue.diagParamMetric;

      newLocalDiagRow["diagParamConvMetricUnit"] =
        convValue.diagParamMetricUnit;
    }

    localDiagRows.push(newLocalDiagRow);
  }

  // Group rows using noteCode
  const localDiagsMap = {};

  for (const localDiagRow of localDiagRows) {
    if (empty(localDiagRow.diagParamValue)) continue;

    if (localDiagsMap[localDiagRow.code] === undefined) {
      localDiagsMap[localDiagRow.code] = {
        // allParamsVisible: true,
        // facility: "UERMMMC",
        typeCode: "LAB",
        code: localDiagRow.diagCode,
        name: localDiagRow.diagName,
        date: localDiagRow.diagDate,
        hl7FileName: localDiagRow.hl7FileName,
        params: [],
      };
    }

    const diagParam = {
      code: localDiagRow.diagParamCode,
      name: localDiagRow.diagParamName,
      type: localDiagRow.diagParamFieldTypeCode,
      hasRange: localDiagRow.diagParamHasRange,
      sequence: localDiagRow.diagParamSequence,

      siValue: localDiagRow.diagParamValue,
      siRefNormalRange: localDiagRow.diagParamRefNormalRange ?? "",
      siMetricUnit: localDiagRow.diagParamMetricUnit ?? "",

      convValue: localDiagRow.diagParamConvValue,
      convRefNormalRange: localDiagRow.diagParamConvNormalRange ?? "",
      convMetricUnit: localDiagRow.diagParamConvMetricUnit ?? "",

      valueFlag: localDiagRow.diagParamValueFlag ?? "",
    };

    localDiagsMap[localDiagRow.code].params.push(diagParam);
  }

  return Object.values(localDiagsMap);
};

// export const formatRadResultRows = (rows) => {
//   const ret = [];

//   for (const row of rows) {
//     ret.push({
//       chargeSlipNo: row.chargeSlipNo,
//       date: row.dateTimeCreated
//         ? jsDateToISOString(new Date(row.dateTimeCreated)).substring(0, 19)
//         : null,
//       typeCode: "RAD",
//       code: row.description,
//       name: "Radiology",
//       fileUrl: row.fileUrl,
//       initImpression:
//         "[INITIAL IMPRESSION]\n\n" + removeHTMLTags(row.initImpression),
//     });
//   }

//   return ret;
// };

export const numberToPhpCurrency = (number, hideCurrencySign = true) => {
  if (hideCurrencySign) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  }

  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "PHP",
  });
};

export const round = (val, decimalCount = 2) => {
  const multiplier = 10 ** decimalCount;
  return Math.round(val * multiplier * (1 + Number.EPSILON)) / multiplier;
};

export const inRange = (val, from, to) => {
  return val >= from && val <= to;
};

export const pwFromBirthDate = (date) => {
  if (!date) throw "`date` is required.";

  const birthYear = String(date.getFullYear());
  const birthMonth = String(date.getMonth() + 1).padStart(2, "0");
  const birthDay = String(date.getDate()).padStart(2, "0");
  return `${birthMonth}/${birthDay}/${birthYear}`;
};

export const log = (val, prefix) => {
  const arr = [val];
  if (prefix != null && prefix !== "") arr.unshift(prefix + ":");
  console.log(...arr);
};

export const allPropsEmpty = (obj) => {
  return !Object.values(obj).some((val) => !empty(val));
};

// Returns a new obj NOT containing the props given
export const sliceObj = (obj, ...props) => {
  const copy = { ...obj };
  for (const prop of props) delete copy[prop];
  return copy;
};

export const formatName = (firstName, middleName, lastName, extName) => {
  return `${lastName}, ${firstName}${extName ? " ".concat(extName) : ""}${
    middleName ? " ".concat(middleName[0]).concat(".") : ""
  }`;
};
