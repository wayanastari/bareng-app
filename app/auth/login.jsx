import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Text } from "react-native";
import AuthLayout from "../../components/auth_components/AuthLayout";
import FormButton from "../../components/auth_components/FormButton";
import FormInput from "../../components/auth_components/FormInput";
import { auth } from "../../config/firebase.jsx";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/");
    } catch (error) {
      console.error("Login Error:", error);
      alert(error.message);
    }
  };

  return (
    <AuthLayout title="Sign in to your account">
      <FormInput
        label="Email Address"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
      />

      <FormButton title="Sign in" onPress={handleLogin} />

      <Text style={{ textAlign: "center", color: "#d1d5db", marginTop: 30 }}>
        Don’t have an account?
        <Text
          onPress={() => router.push("/auth/signup")}
          style={{ color: "#ffffff", fontWeight: "bold" }}
        >
          {" "}
          Sign Up
        </Text>
      </Text>
    </AuthLayout>
  );
};

export default Login;
