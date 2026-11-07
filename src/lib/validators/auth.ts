// Keep legacy import paths on the same rules as forms and server actions.
export {
  loginSchema, registerSchema as signupSchema, forgotPasswordSchema,
  type LoginFormData, type RegisterFormData as SignupFormData, type ForgotPasswordFormData,
} from "@/lib/validations";
