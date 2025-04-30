import { getServerSession } from "next-auth";
import { authOptions } from "../[...nextauth]/route";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return new Response(JSON.stringify({ message: "Not authenticated" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return success response - actual sign out will be handled by the client
    return new Response(JSON.stringify({ message: "Sign out successful" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error in sign out:", error);
    return new Response(JSON.stringify({ message: "Error during sign out" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
