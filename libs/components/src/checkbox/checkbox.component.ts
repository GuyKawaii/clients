import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from "@angular/core";
import { NgControl, Validators } from "@angular/forms";

let nextId = 0;

import { BitFormControlAbstraction } from "../form-control";
import { FormControlCardComponent } from "../form-control/form-control-card.component";
import { FormControlGroupComponent } from "../form-control/form-control-group.component";

import { checkboxCheckMask, checkboxInputClasses } from "./checkbox-styles";

@Component({
  selector: "input[type=checkbox][bitCheckbox]",
  template: "",
  providers: [{ provide: BitFormControlAbstraction, useExisting: CheckboxComponent }],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[id]": "id()",
    "[checked]": "isGroupChecked()",
    "[disabled]": "disabled",
    "[class]": "inputClasses",
    "[style.--check-mask]": "checkMask",
    "[style.--indeterminate-mask-image]": "indeterminateImage",
    "[attr.aria-labelledby]": "cardLabelledBy()",
    "[attr.aria-describedby]": "cardDescribedBy()",
    "(change)": "onGroupChange()",
  },
})
export class CheckboxComponent implements BitFormControlAbstraction {
  readonly inputEl = inject<ElementRef<HTMLInputElement>>(ElementRef);
  protected readonly group = inject(FormControlGroupComponent, { optional: true });
  private readonly card = inject(FormControlCardComponent, { optional: true });

  readonly id = input(`bit-checkbox-${nextId++}`);
  readonly ariaDescribedBy = input<string | null>(null, { alias: "aria-describedby" });
  get inputId(): string {
    return this.id();
  }

  protected readonly cardLabelledBy = computed(() => this.card?.labelId ?? null);
  protected readonly cardDescribedBy = computed(() => {
    if (!this.card) {
      return this.ariaDescribedBy();
    }
    return (
      [this.ariaDescribedBy(), this.card.effectiveErrorId, this.card.effectiveHintId()]
        .filter(Boolean)
        .join(" ") || null
    );
  });

  protected readonly inputClasses = [
    ...checkboxInputClasses,
    // Negate the sizing offset inside Angular form controls.
    "!-tw-mt-px",
    "!-tw-mb-px",
    "!-tw-ms-px",
  ];

  private readonly ngControl = inject(NgControl, { optional: true, self: true });

  readonly value = input<unknown>();

  // In the group path this is a reactive signal dependency; re-evaluates when selectedValues
  // changes. In the standalone path there are no signal dependencies so the computed is
  // evaluated once (after writeValue has already run in ngOnInit) and then frozen — the
  // ControlValueAccessor owns all subsequent DOM updates.
  protected readonly isGroupChecked = computed(() => {
    if (this.group && this.value() !== undefined) {
      return this.group.selectedValues().includes(this.value());
    }
    return this.inputEl.nativeElement.checked;
  });

  protected onGroupChange() {
    if (this.group && this.value() !== undefined) {
      this.group.onItemChange(this.value());
    }
  }

  protected readonly checkMask = checkboxCheckMask;

  protected readonly indeterminateImage = `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M6 13C5.71667 13 5.47917 12.9042 5.2875 12.7125C5.09583 12.5208 5 12.2833 5 12C5 11.7167 5.09583 11.4792 5.2875 11.2875C5.47917 11.0958 5.71667 11 6 11H18C18.2833 11 18.5208 11.0958 18.7125 11.2875C18.9042 11.4792 19 11.7167 19 12C19 12.2833 18.9042 12.5208 18.7125 12.7125C18.5208 12.9042 18.2833 13 18 13H6Z' fill='currentColor'/%3E%3C/svg%3E")`;

  readonly disabledInput = input(false, { transform: booleanAttribute, alias: "disabled" });

  // TODO migrate to computed signal when Angular adds signal support to reactive forms
  // https://bitwarden.atlassian.net/browse/CL-819
  get disabled() {
    return this.disabledInput() || this.ngControl?.disabled || this.group?.groupDisabled() || false;
  }

  get required() {
    return this.ngControl?.control?.hasValidator(Validators.requiredTrue) ?? false;
  }

  get hasError() {
    return !!(this.ngControl?.status === "INVALID" && this.ngControl?.touched);
  }

  get error(): [string, any] {
    const errors = this.ngControl?.errors ?? {};
    const key = Object.keys(errors)[0];
    return [key, errors[key]];
  }
}
