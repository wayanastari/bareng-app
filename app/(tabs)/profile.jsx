import { router } from "expo-router";
import { getAuth, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../config/firebase";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          if (data.partnerId) {
            const partnerSnap = await getDoc(doc(db, "users", data.partnerId));
            if (partnerSnap.exists()) {
              setPartnerName(partnerSnap.data().name);
            }
          }
        }
      };
      fetchUserData();
    }
  }, [user]);

  const generatePairingCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleGeneratePairingCode = async () => {
    if (userData?.partnerId) {
      Alert.alert("Already Paired", "You already have a partner.");
      return;
    }
    if (userData?.pairingCode) {
      Alert.alert("Pairing Code Exists", `Your code: ${userData.pairingCode}`);
      return;
    }

    const code = generatePairingCode();
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { pairingCode: code });
      setUserData((prev) => ({ ...prev, pairingCode: code }));
      Alert.alert("Pairing Code Generated", code);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePairing = async () => {
    if (!pairingCodeInput) {
      Alert.alert("Error", "Please enter a pairing code.");
      return;
    }

    try {
      const q = query(
        collection(db, "users"),
        where("pairingCode", "==", pairingCodeInput)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert("Error", "Invalid pairing code.");
        return;
      }

      const partnerDoc = querySnapshot.docs[0];
      const partnerId = partnerDoc.id;

      if (partnerId === user.uid) {
        Alert.alert("Error", "You cannot pair with yourself.");
        return;
      }

      if (userData?.partnerId) {
        Alert.alert("Already Paired", "You already have a partner.");
        return;
      }

      // Update both users
      const myRef = doc(db, "users", user.uid);
      const partnerRef = doc(db, "users", partnerId);

      await updateDoc(myRef, { partnerId });
      await updateDoc(partnerRef, { partnerId: user.uid });

      setUserData({ ...userData, partnerId });
      setPartnerName(partnerDoc.data().name);
      Alert.alert("Success", "You are now paired!");
    } catch (error) {
      Alert.alert("Error", "Pairing failed.");
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      Alert.alert("Logout Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {userData ? (
        <>
          <Text style={styles.text}>Hello, {userData.name}</Text>

          <Text style={styles.label}>Your Pairing Code:</Text>
          <Text style={styles.code}>
            {userData.pairingCode || "Not generated"}
          </Text>

          {!userData.partnerId && (
            <TouchableOpacity
              style={styles.button}
              onPress={handleGeneratePairingCode}
            >
              <Text style={styles.buttonText}>Generate Code</Text>
            </TouchableOpacity>
          )}

          {!userData.partnerId && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Enter Partner's Code"
                value={pairingCodeInput}
                onChangeText={setPairingCodeInput}
              />
              <TouchableOpacity style={styles.button} onPress={handlePairing}>
                <Text style={styles.buttonText}>Pair</Text>
              </TouchableOpacity>
            </>
          )}

          {userData.partnerId && partnerName && (
            <Text style={styles.text}>You are paired with: {partnerName}</Text>
          )}
        </>
      ) : (
        <Text style={styles.text}>Loading...</Text>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#ef4444" }]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  text: {
    color: "white",
    fontSize: 18,
    marginVertical: 10,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 16,
  },
  code: {
    color: "#f472b6",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    width: "100%",
    padding: 10,
    marginVertical: 10,
  },
  button: {
    backgroundColor: "#9333ea",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginVertical: 5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
