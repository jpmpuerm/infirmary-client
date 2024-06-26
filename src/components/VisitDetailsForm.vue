<template>
  <div>
    <!-- <div class="bg-white flex flex-center" style="height: 200px; opacity: 0.8">
      <q-spinner-dots color="black" size="md" />
    </div> -->
    <FetchingData v-if="loading" />
    <q-form v-else ref="qFormVisitDetails" @submit="save">
      <div
        class="fit"
        style="display: grid; grid-template-rows: auto min-content"
      >
        <div
          class="q-pa-lg scroll"
          style="height: auto; max-height: 70vh; min-height: 100px"
        >
          <template v-for="field in tabFieldsMap[tab.code]" :key="field.code">
            <div>
              <q-input
                v-if="field.type === 'TEXT'"
                :disable="visitIsCompleted || field.disable || loading"
                stack-label
                outlined
                :rules="generateRules(field.required)"
                :label="field.name"
                v-model.trim="value[field.code]"
                hint=""
              />
              <q-input
                v-if="field.type === 'TEXTAREA'"
                :disable="visitIsCompleted || field.disable || loading"
                type="textarea"
                stack-label
                outlined
                :rules="generateRules(field.required)"
                :label="field.name"
                v-model.trim="value[field.code]"
                hint=""
              />
              <UserSelect
                v-if="field.type === 'PHYSICIANSELECT'"
                label="Physician"
                :roleCode="userRolesMap.DR.code"
                :disable="visitIsCompleted || field.disable || loading"
                :initialValue="value[field.code]"
                @valueChanged="(val) => (value[field.code] = val)"
              />
              <DiagTest
                v-if="field.type === 'DIAGTEST'"
                :disable="visitIsCompleted || field.disable || loading"
                :label="field.name"
                :diagParamCode="field.code"
                :initialValue="value[field.code]"
                @valueChanged="(val) => (value[field.code] = val)"
              />
              <DiagTestTextArea
                v-if="field.type === 'DIAGTESTTEXTAREA'"
                :disable="visitIsCompleted || field.disable || loading"
                :required="field.required"
                :label="field.name"
                :diagParamCode="field.code"
                :initialValue="value[field.code]"
                @valueChanged="(val) => (value[field.code] = val)"
              />
              <DiagTestSelect
                v-if="field.type === 'DIAGTESTSELECT'"
                :disable="visitIsCompleted || field.disable || loading"
                :options="field.options"
                :required="field.required"
                :label="field.name"
                :diagParamCode="field.code"
                :initialValue="value[field.code]"
                @valueChanged="(val) => (value[field.code] = val)"
              />
            </div>
          </template>
          <q-input
            :disable="visitIsCompleted || loading"
            type="textarea"
            stack-label
            outlined
            label="Remarks"
            v-model.trim="value.REMARKS"
            hint=""
          />
        </div>
        <q-separator />
        <div
          class="row q-pa-lg"
          :class="
            markAsCompletedOnSave != null && !visitIsCompleted
              ? 'justify-between'
              : 'justify-end'
          "
          style="gap: 12px"
        >
          <q-checkbox
            v-if="markAsCompletedOnSave != null && !visitIsCompleted"
            v-model="markAsCompletedOnSave"
            label="Mark Exam As Completed On Save"
          />
          <q-btn
            unelevated
            :disable="visitIsCompleted"
            class="text-white bg-primary"
            :loading="loading"
            :label="visitIsCompleted ? 'COMPLETED' : 'SAVE'"
            @click="submitForm"
          />
        </div>
      </div>
    </q-form>
    <ConfirmationDialog
      v-if="confDialogVisible"
      question="Are you sure you want to save visit details?"
      @ok="this.$refs.qFormVisitDetails.submit"
      @cancel="confDialogVisible = false"
    />
  </div>
</template>

<script>
import { defineComponent, defineAsyncComponent } from "vue";
import { delay, formatDate, showMessage, isObj } from "src/helpers/util.js";
import {
  exams,
  examsMap,
  examFieldsMap,
  userRolesMap,
} from "src/helpers/constants.js";

export default defineComponent({
  name: "VisitDetailsForm",
  components: {
    ConfirmationDialog: defineAsyncComponent(() =>
      import("src/components/core/ConfirmationDialog.vue")
    ),
    DiagTest: defineAsyncComponent(() =>
      import("src/components/core/form-fields/DiagTest.vue")
    ),
    DiagTestTextArea: defineAsyncComponent(() =>
      import("src/components/core/form-fields/DiagTestTextArea.vue")
    ),
    DiagTestSelect: defineAsyncComponent(() =>
      import("src/components/core/form-fields/DiagTestSelect.vue")
    ),
    FetchingData: defineAsyncComponent(() =>
      import("src/components/core/FetchingData.vue")
    ),
    UserSelect: defineAsyncComponent(() =>
      import("src/components/core/form-fields/UserSelect.vue")
    ),
  },
  props: {
    visitId: {
      type: Number,
      required: true,
    },
    patientId: {
      type: Number,
      required: true,
    },
    tab: {
      type: Object,
      required: true,
    },
    visitIsCompleted: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["busy", "ready", "success", "error"],
  setup() {
    return {
      userRolesMap,
      generateRules(required) {
        return required
          ? [
              (val) => {
                if (val == null || val === "") return "This field is required.";
              },
            ]
          : [];
      },
      showMessage,
      formatDate,
      tabFieldsMap: {
        VISIT: [
          {
            code: "PATIENTNAME",
            name: "Patient Name",
            type: "TEXT",
            disable: true,
          },
          {
            code: "CREATEDBY",
            name: "Added By",
            type: "TEXT",
            disable: true,
          },
          {
            code: "DATETIMECREATED",
            name: "Date & Time Visited",
            type: "TEXT",
            format: formatDate,
            disable: true,
          },
          {
            code: "COMPLETEDBY",
            name: "Completed By",
            type: "TEXT",
            default: "NOT YET COMPLETED",
            disable: true,
          },
          {
            code: "DATETIMECOMPLETED",
            name: "Date & Time Completed",
            type: "TEXT",
            format: formatDate,
            default: "NOT YET COMPLETED",
            disable: true,
          },
          {
            code: "PHYSICIAN",
            name: "Physician",
            type: "PHYSICIANSELECT",
            required: true,
          },
        ],
        ...examFieldsMap,
      },
      // inputRule: (val) =>
      //   val == null || val === "" ? "Field is required." : undefined,
    };
  },
  data() {
    return {
      loading: false,
      value: {},
      markAsCompletedOnSave: null,
      confDialogVisible: false,
    };
  },
  watch: {
    tab: {
      handler(val) {
        this.init();
      },
      immediate: true,
    },
    loading: {
      handler(val) {
        this.$emit(val ? "busy" : "ready");
      },
      immediate: true,
    },
  },
  methods: {
    formatValue(val) {
      if (!val) return {};

      return Object.entries(val).reduce((acc, entry) => {
        const key = entry[0].toUpperCase();
        const val = entry[1];

        // CONVERT "" PROPS TO null
        acc[key] = isObj(val)
          ? Object.entries(val).reduce((acc, e) => {
              acc[e[0]] = e[1] === "" ? null : e[1];
              return acc;
            }, {})
          : val;

        return acc;
      }, {});
    },
    formatDiagValue(val) {
      if (!val) return {};

      return val.reduce((acc, row) => {
        acc[row.DiagParamCode] = {
          value: row.DiagParamValue,
          ...(row.DiagParamUnit == null ? {} : { unit: row.DiagParamUnit }),
          ...(row.DiagParamNormalRange == null
            ? {}
            : { normalRange: row.DiagParamNormalRange }),
        };

        return acc;
      }, {});
    },
    mergeTempAndVal(template, obj) {
      return template.reduce((acc, field) => {
        if (obj[field.code] == null || obj[field.code] === "") {
          acc[field.code] = field.default ?? null;
        } else {
          acc[field.code] = field.format
            ? field.format(obj[field.code])
            : obj[field.code];
        }

        return acc;
      }, {});
    },
    async getInitialValue() {
      this.loading = true;

      const isExam = [
        examsMap.LABCBC.code,
        examsMap.LABURI.code,
        examsMap.LABFCL.code,
        examsMap.RADXRCHST.code,
      ].includes(this.tab.code);

      // SUPPLY DEFAULT VALUE
      this.value = this.mergeTempAndVal(
        this.tabFieldsMap[this.tab.code],
        isExam ? this.formatDiagValue([]) : this.formatValue({})
      );

      const response = await this.$store.dispatch("ape/getVisitDetails", {
        visitId: this.visitId,
        patientId: this.patientId,
        tabCode: this.tab.code,
      });

      await delay(1000);

      if (response.error) {
        this.loading = false;
        return;
      }

      if (!response.body || response.body.length === 0) {
        this.loading = false;
        return;
      }

      const formatter = isExam ? this.formatDiagValue : this.formatValue;
      const val = isExam ? response.body : response.body[0];

      const remarks = isExam
        ? val[0].Remarks
        : val?.REMARKS ?? val?.Remarks ?? val?.remarks ?? null;

      this.value = {
        ...this.mergeTempAndVal(
          this.tabFieldsMap[this.tab.code],
          formatter(val)
        ),
        REMARKS: remarks,
      };

      this.loading = false;
    },
    async init() {
      this.markAsCompletedOnSave = null;
      const isExamTab = exams.some((e) => e.code === this.tab.code);

      if (isExamTab && !this.visitIsCompleted) {
        this.markAsCompletedOnSave = true;
      }

      this.getInitialValue();
    },
    async submitForm() {
      const valid = await this.$refs.qFormVisitDetails.validate();
      if (valid) this.confDialogVisible = true;
    },
    async save() {
      this.confDialogVisible = false;
      this.loading = true;
      await delay(2000);

      const payload = {
        visitId: this.visitId,
        patientId: this.patientId,
        tabCode: this.tab.code,
        details: this.formatValue(this.value),
      };

      if (this.markAsCompletedOnSave === true) {
        payload.markAsCompletedOnSave = true;
      }

      const response = await this.$store.dispatch("ape/saveDetails", payload);

      if (response.error) {
        showMessage(this.$q, false, response.body);
        this.loading = false;
        this.$emit("error");
        return;
      }

      showMessage(this.$q, true, "Visit details have been saved successfully.");
      this.loading = false;
      this.$emit("success");
    },
  },
});
</script>
