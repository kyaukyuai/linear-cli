import { Command } from "@cliffy/command"
import { getTeamMembers, requireTeamKey } from "../../utils/linear.ts"
import { handleError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"

export const membersCommand = new Command()
  .name("members")
  .description("List team members")
  .arguments("[teamKey:string]")
  .option("-a, --all", "Include inactive members")
  .option("-j, --json", "Output as JSON")
  .action(async ({ all, json }, teamKey?: string) => {
    try {
      const resolvedTeamKey = requireTeamKey(teamKey)

      const members = await withSpinner(
        () => getTeamMembers(resolvedTeamKey),
        { enabled: !json },
      )

      const filteredMembers = all
        ? members
        : members.filter((member) => member.active)

      if (json) {
        console.log(JSON.stringify(
          {
            team: resolvedTeamKey,
            includeInactive: all,
            members: filteredMembers.map((member) => ({
              id: member.id,
              name: member.name,
              displayName: member.displayName,
              email: member.email,
              active: member.active,
              initials: member.initials,
              description: member.description,
              timezone: member.timezone,
              lastSeen: member.lastSeen,
              statusEmoji: member.statusEmoji,
              statusLabel: member.statusLabel,
              guest: member.guest,
              isAssignable: member.isAssignable,
            })),
          },
          null,
          2,
        ))
        return
      }

      if (members.length === 0) {
        console.log("No members found for this team.")
        return
      }

      if (filteredMembers.length === 0) {
        console.log(
          "No active members found for this team. Use --all to include inactive members.",
        )
        return
      }

      console.log(`Team Members (${filteredMembers.length}):`)
      console.log("")

      for (const member of filteredMembers) {
        const status = member.active ? "" : " (inactive)"
        const guestStatus = member.guest ? " (guest)" : ""
        const assignableStatus = !member.isAssignable ? " (not assignable)" : ""
        const displayName = member.displayName || member.name
        const fullName = member.name !== member.displayName
          ? ` (${member.name})`
          : ""

        console.log(
          `${displayName}${fullName} [${member.initials}]${status}${guestStatus}${assignableStatus}`,
        )
        if (member.email) {
          console.log(`  Email: ${member.email}`)
        }
        if (member.description) {
          console.log(`  Role: ${member.description}`)
        }
        if (member.timezone) {
          console.log(`  Timezone: ${member.timezone}`)
        }
        if (member.statusEmoji && member.statusLabel) {
          console.log(
            `  Status: ${member.statusEmoji} ${member.statusLabel}`,
          )
        }
        if (member.lastSeen) {
          const lastSeenDate = new Date(member.lastSeen)
          console.log(`  Last seen: ${lastSeenDate.toLocaleString()}`)
        }
        console.log("")
      }
    } catch (error) {
      handleError(error, "Failed to fetch team members")
    }
  })
