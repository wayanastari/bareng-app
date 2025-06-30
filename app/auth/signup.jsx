import { router } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Text } from "react-native";
import AuthLayout from "../../components/auth_components/AuthLayout";
import FormButton from "../../components/auth_components/FormButton";
import FormInput from "../../components/auth_components/FormInput";
import { auth, db } from "../../config/firebase.jsx";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // const [pairingCode, setPairingCode] = useState("");

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        name,
        email,
        partnerId: "",
        uid: user.uid,
      });

      alert("Signup successful!");
      router.replace("/auth/login");
    } catch (error) {
      console.error("Signup Error:", error);
      alert(error.message);
    }
  };

  return (
    <AuthLayout title="Sign Up">
      <FormInput
        label="Full Name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
      />
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
        placeholder="********"
        secureTextEntry
      />
      <FormInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="********"
        secureTextEntry
      />
      {/* <FormInput
        label="Pairing Code (optional)"
        value={pairingCode}
        onChangeText={setPairingCode}
        placeholder="ABC123"
      /> */}
      <FormButton title="Sign Up" onPress={handleSignup} />
      <Text style={{ textAlign: "center", color: "#d1d5db", marginTop: 30 }}>
        Already have an account?
        <Text
          onPress={() => router.push("/auth/login")}
          style={{ color: "#ffffff", fontWeight: "bold" }}
        >
          {" "}
          Sign In
        </Text>
      </Text>
    </AuthLayout>
  );
};

export default Signup;
