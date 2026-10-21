// The latest draw's winners and prizes, read on the server.
import { campaign } from "@/lib/prizerail";

// Read on each request, so a new draw shows up without a rebuild.
export const dynamic = "force-dynamic";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export default async function Page() {
  const [info, drawing] = await Promise.all([
    campaign.get(),
    campaign.drawings.latest(),
  ]);

  return (
    <main>
      <h1>{info.name}</h1>
      {info.nextDrawing && (
        <p>
          Next draw {new Date(info.nextDrawing.drawAt).toUTCString()}.
          Entries close {new Date(info.nextDrawing.cutoffAt).toUTCString()}.
        </p>
      )}

      {drawing ? (
        <>
          <h2>Latest draw, {new Date(drawing.drawAt).toUTCString()}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Winner</th>
                <th className="amount">Prize</th>
              </tr>
            </thead>
            <tbody>
              {drawing.winners.map(w => (
                <tr key={w.position}>
                  <td>{w.position + 1}</td>
                  <td>
                    {w.avatarUrl && <img src={w.avatarUrl} alt="" />}
                    {w.displayName ?? `${w.winner.slice(0, 10)}…`}
                  </td>
                  <td className="amount">
                    {w.amountCents === undefined ? "" : usd.format(w.amountCents / 100)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <a href={info.page}>See every draw and check it yourself</a>
          </p>
        </>
      ) : (
        <p>No draws yet.</p>
      )}
    </main>
  );
}
